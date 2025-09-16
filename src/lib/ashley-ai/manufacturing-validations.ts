// Ashley AI Manufacturing Validations
// Based on CLIENT_UPDATED_PLAN.md specifications

import { prisma } from '@/lib/prisma'

export interface ValidationResult {
  risk: 'GREEN' | 'AMBER' | 'RED'
  issues: ValidationIssue[]
  advice: string[]
  assumptions: Record<string, any>
  blocking?: boolean
}

export interface ValidationIssue {
  type: 'CAPACITY' | 'STOCK' | 'ROUTE_SAFETY' | 'COMMERCIALS'
  workcenter?: string
  item?: string
  details: string
  action?: string
  severity: 'INFO' | 'WARN' | 'ERROR'
}

export interface OrderValidationData {
  order_id: string
  method: string
  total_qty: number
  size_curve: Record<string, number>
  variants?: Array<{ color: string; qty: number }>
  addons?: string[]
  target_delivery_date: string
  commercials?: {
    unit_price?: number
    deposit_pct?: number
    terms?: string
    tax_mode?: string
    currency?: string
  }
  routing_steps?: Array<{
    name: string
    workcenter: string
    sequence: number
    depends_on: string[]
  }>
}

/**
 * Main Ashley AI validation function for order intake
 * Triggered on order create, routing changes, qty/date/method edits
 */
export async function validateOrderIntake(data: OrderValidationData): Promise<ValidationResult> {
  const result: ValidationResult = {
    risk: 'GREEN',
    issues: [],
    advice: [],
    assumptions: {}
  }

  try {
    // 1. Capacity vs Deadlines
    const capacityCheck = await validateCapacityVsDeadlines(data)
    result.issues.push(...capacityCheck.issues)
    result.advice.push(...capacityCheck.advice)
    Object.assign(result.assumptions, capacityCheck.assumptions)

    // 2. Stock Availability
    const stockCheck = await validateStockAvailability(data)
    result.issues.push(...stockCheck.issues)
    result.advice.push(...stockCheck.advice)

    // 3. Method/Route Safety
    const routeCheck = await validateRouteSafety(data)
    result.issues.push(...routeCheck.issues)
    result.advice.push(...routeCheck.advice)
    if (routeCheck.blocking) result.blocking = true

    // 4. Commercials Sanity
    const commercialCheck = await validateCommercials(data)
    result.issues.push(...commercialCheck.issues)
    result.advice.push(...commercialCheck.advice)

    // Determine overall risk level
    result.risk = determineOverallRisk(result.issues)

    return result

  } catch (error) {
    console.error('Error in Ashley AI validation:', error)
    return {
      risk: 'RED',
      issues: [{
        type: 'CAPACITY',
        details: 'Validation system error',
        severity: 'ERROR'
      }],
      advice: ['Contact system administrator'],
      assumptions: {}
    }
  }
}

/**
 * 1. Capacity vs Deadlines Validation
 * Check if workcenters have sufficient capacity for target schedule
 */
export async function validateCapacityVsDeadlines(data: OrderValidationData) {
  const issues: ValidationIssue[] = []
  const advice: string[] = []
  const assumptions: Record<string, any> = {}

  try {
    // Standard time estimates by method/product (minutes per piece)
    const standardTimes = {
      CUTTING: 0.6,
      PRINTING: {
        SILKSCREEN: 1.5, // per coat
        SUBLIMATION: 2.0,
        DTF: 1.8,
        EMBROIDERY: 4.5 // per 1000 stitches
      },
      SEWING: 8.5, // average SMV
      QC: 0.3,
      PACKING: 0.5
    }

    // Get capacity settings (operators × shift mins × utilization)
    const workcenters = await prisma.machine.findMany({
      where: { is_active: true },
      select: {
        workcenter: true,
        name: true,
        spec: true
      }
    })

    // Default capacity assumptions
    const capacityAssumptions = {
      operators_per_workcenter: { CUTTING: 2, PRINTING: 3, SEWING: 8, QC: 2, PACKING: 2 },
      shift_minutes: 480, // 8 hours
      utilization: 0.8,
      printing_rate_pcs_per_hr: 55
    }

    assumptions.capacity = capacityAssumptions

    // Calculate required time for each workcenter
    const targetDate = new Date(data.target_delivery_date)
    const daysAvailable = Math.max(1, Math.floor((targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))

    for (const step of data.routing_steps || []) {
      const workcenter = step.workcenter as keyof typeof capacityAssumptions.operators_per_workcenter

      // Calculate required minutes
      let requiredMinutes = 0
      if (workcenter === 'PRINTING') {
        const methodTime = standardTimes.PRINTING[data.method as keyof typeof standardTimes.PRINTING] || 2.0
        requiredMinutes = data.total_qty * methodTime
      } else {
        const baseTime = standardTimes[workcenter as keyof typeof standardTimes] as number || 1.0
        requiredMinutes = data.total_qty * baseTime
      }

      // Calculate available capacity
      const operators = capacityAssumptions.operators_per_workcenter[workcenter] || 1
      const availableMinutes = operators * capacityAssumptions.shift_minutes * capacityAssumptions.utilization * daysAvailable

      // Check capacity
      const utilizationPercent = (requiredMinutes / availableMinutes) * 100

      if (utilizationPercent > 100) {
        issues.push({
          type: 'CAPACITY',
          workcenter: step.workcenter,
          details: `+${Math.round(utilizationPercent - 100)}% over capacity in ${workcenter}`,
          severity: 'ERROR'
        })

        advice.push(`Move dates, add shifts, or subcontract ${workcenter.toLowerCase()}`)
      } else if (utilizationPercent > 85) {
        issues.push({
          type: 'CAPACITY',
          workcenter: step.workcenter,
          details: `${Math.round(utilizationPercent)}% capacity utilization in ${workcenter}`,
          severity: 'WARN'
        })

        advice.push(`Consider overtime or split batches for ${workcenter.toLowerCase()}`)
      }
    }

  } catch (error) {
    console.error('Error validating capacity:', error)
    issues.push({
      type: 'CAPACITY',
      details: 'Unable to calculate capacity requirements',
      severity: 'WARN'
    })
  }

  return { issues, advice, assumptions }
}

/**
 * 2. Stock Availability Validation
 * Check inventory for fabric/ink/supplies and create PR if needed
 */
export async function validateStockAvailability(data: OrderValidationData) {
  const issues: ValidationIssue[] = []
  const advice: string[] = []

  try {
    // Get order details for BOM calculation
    const order = await prisma.order.findUnique({
      where: { id: data.order_id },
      include: { brand: true }
    })

    if (!order) {
      issues.push({
        type: 'STOCK',
        details: 'Order not found for stock validation',
        severity: 'ERROR'
      })
      return { issues, advice }
    }

    // Calculate fabric requirements (simplified BOM)
    const fabricRequirements = calculateFabricBOM(data)

    // Check fabric availability
    const fabricBatches = await prisma.fabricBatch.findMany({
      where: {
        brand_id: order.brand_id,
        qty_on_hand: { gt: 0 }
      }
    })

    for (const [fabricType, requiredQty] of Object.entries(fabricRequirements)) {
      const availableQty = fabricBatches
        .filter(batch => batch.item_id.includes(fabricType)) // Simplified matching
        .reduce((sum, batch) => sum + parseFloat(batch.qty_on_hand.toString()), 0)

      if (availableQty < requiredQty) {
        const shortfall = requiredQty - availableQty

        issues.push({
          type: 'STOCK',
          item: fabricType,
          details: `Short by ${shortfall.toFixed(2)} kg of ${fabricType}`,
          action: 'PR_DRAFTED',
          severity: 'WARN'
        })

        advice.push(`Create purchase request for ${shortfall.toFixed(2)} kg ${fabricType}`)
      }
    }

    // Check ink/supplies for printing methods
    if (['SILKSCREEN', 'SUBLIMATION', 'DTF'].includes(data.method)) {
      const inkRequirements = calculateInkBOM(data)

      advice.push(`Estimated ink requirement: ${inkRequirements.total_grams}g for ${data.method}`)
    }

  } catch (error) {
    console.error('Error validating stock:', error)
    issues.push({
      type: 'STOCK',
      details: 'Unable to check inventory availability',
      severity: 'WARN'
    })
  }

  return { issues, advice }
}

/**
 * 3. Method/Route Safety Validation
 * Validate route choices and method constraints
 */
export async function validateRouteSafety(data: OrderValidationData) {
  const issues: ValidationIssue[] = []
  const advice: string[] = []
  let blocking = false

  try {
    // Check Silkscreen Option B constraints
    if (data.method === 'SILKSCREEN') {
      const routeSteps = data.routing_steps || []
      const sewBeforePrint = routeSteps.some(step =>
        step.name.includes('Sew') && step.sequence <
        (routeSteps.find(s => s.name.includes('Print'))?.sequence || 999)
      )

      if (sewBeforePrint) {
        // Check print area (simplified - would need design data)
        const estimatedPrintArea = data.total_qty > 200 ? 'LARGE' : 'SMALL'

        if (estimatedPrintArea === 'LARGE') {
          issues.push({
            type: 'ROUTE_SAFETY',
            details: 'Large print area with Sew → Print route poses high risk',
            severity: 'ERROR'
          })
          advice.push('Switch to Print → Sew route or reduce print area')
          blocking = true
        }
      }
    }

    // Check Sublimation AOP requirements
    if (data.method === 'SUBLIMATION') {
      const routeSteps = data.routing_steps || []
      const cutBeforePress = routeSteps.some(step =>
        step.name.includes('Cut') && step.sequence <
        (routeSteps.find(s => s.name.includes('Heat Press'))?.sequence || 999)
      )

      if (cutBeforePress) {
        issues.push({
          type: 'ROUTE_SAFETY',
          details: 'AOP sublimation requires print/heat before cutting',
          severity: 'WARN'
        })
        advice.push('Reorder route: Print → Heat Press → Cut → Sew')
      }
    }

    // Check DTF requirements
    if (data.method === 'DTF') {
      const routeSteps = data.routing_steps || []
      const hasReceiveBlanks = routeSteps.some(step => step.name.includes('Receive'))

      if (!hasReceiveBlanks) {
        issues.push({
          type: 'ROUTE_SAFETY',
          details: 'DTF requires blank garments before press',
          severity: 'WARN'
        })
        advice.push('Add "Receive Plain Tee" step before DTF process')
      }
    }

  } catch (error) {
    console.error('Error validating route safety:', error)
    issues.push({
      type: 'ROUTE_SAFETY',
      details: 'Unable to validate route safety',
      severity: 'WARN'
    })
  }

  return { issues, advice, blocking }
}

/**
 * 4. Commercials Sanity Check
 * Validate pricing against cost and margin requirements
 */
export async function validateCommercials(data: OrderValidationData) {
  const issues: ValidationIssue[] = []
  const advice: string[] = []

  try {
    if (!data.commercials?.unit_price) {
      return { issues, advice }
    }

    // Get brand settings for margin requirements
    const order = await prisma.order.findUnique({
      where: { id: data.order_id },
      include: { brand: true }
    })

    if (!order?.brand?.settings) {
      return { issues, advice }
    }

    const brandSettings = order.brand.settings as any
    const minMarginPercent = brandSettings.min_margin_percent || 25

    // Calculate standard cost (simplified)
    const standardCost = calculateStandardCost(data)
    const marginPercent = ((data.commercials.unit_price - standardCost) / data.commercials.unit_price) * 100

    if (marginPercent < minMarginPercent) {
      issues.push({
        type: 'COMMERCIALS',
        details: `Margin ${marginPercent.toFixed(1)}% below minimum ${minMarginPercent}%`,
        severity: 'WARN'
      })

      const suggestedPrice = standardCost / (1 - minMarginPercent / 100)
      advice.push(`Consider minimum price of ₱${suggestedPrice.toFixed(2)} for ${minMarginPercent}% margin`)
    }

  } catch (error) {
    console.error('Error validating commercials:', error)
    issues.push({
      type: 'COMMERCIALS',
      details: 'Unable to validate pricing',
      severity: 'WARN'
    })
  }

  return { issues, advice }
}

// Helper functions
function calculateFabricBOM(data: OrderValidationData): Record<string, number> {
  // Simplified fabric calculation - 0.5kg per piece average
  const kgPerPiece = 0.5
  return {
    'main_fabric': data.total_qty * kgPerPiece
  }
}

function calculateInkBOM(data: OrderValidationData) {
  const gramsPerPiece = data.method === 'SILKSCREEN' ? 15 :
                       data.method === 'SUBLIMATION' ? 25 : 20 // DTF
  return {
    total_grams: data.total_qty * gramsPerPiece,
    method: data.method
  }
}

function calculateStandardCost(data: OrderValidationData): number {
  // Simplified cost calculation
  const baseCosts = {
    SILKSCREEN: 45,
    SUBLIMATION: 65,
    DTF: 55,
    EMBROIDERY: 75
  }

  return baseCosts[data.method as keyof typeof baseCosts] || 50
}

function determineOverallRisk(issues: ValidationIssue[]): 'GREEN' | 'AMBER' | 'RED' {
  if (issues.some(i => i.severity === 'ERROR')) return 'RED'
  if (issues.some(i => i.severity === 'WARN')) return 'AMBER'
  return 'GREEN'
}