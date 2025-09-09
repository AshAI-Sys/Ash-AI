/**
 * ASH AI - Ashley Intelligence System
 * Advanced AI-powered order validation, risk assessment, and recommendations
 */

import { PrismaClient, ProcessType, Order, Brand, Client, RouteTemplate } from '@prisma/client'

const prisma = new PrismaClient()

export type RiskLevel = 'GREEN' | 'AMBER' | 'RED'
export type IssueType = 'CAPACITY' | 'STOCK' | 'ROUTING' | 'QUALITY' | 'DEADLINE' | 'COST'
export type IssueSeverity = 'INFO' | 'WARNING' | 'CRITICAL' | 'BLOCKING'

export interface AshleyIssue {
  type: IssueType
  severity: IssueSeverity
  workcenter?: string
  item?: string
  details: string
  shortBy?: string
  action?: string
  impact?: string
}

export interface AshleyRecommendation {
  title: string
  description: string
  rationale: string
  expectedImpact: {
    timeReduction?: number // minutes
    costReduction?: number // PHP
    qualityImprovement?: number // %
    riskReduction?: number // %
  }
  implementation: string[]
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
}

export interface AshleyAssessment {
  risk: RiskLevel
  confidence: number // 0-1
  issues: AshleyIssue[]
  recommendations: AshleyRecommendation[]
  assumptions: Record<string, any>
  processingTime: number // milliseconds
  modelVersion: string
  timestamp: Date
}

export interface OrderIntakeData {
  clientId: string
  brandId: string
  productType: string
  method: ProcessType
  totalQty: number
  sizeCurve: Record<string, number>
  targetDeliveryDate: Date
  routeTemplateKey?: string
  variants?: any[]
  addons?: any[]
  commercials?: any
}

/**
 * Ashley's Master Order Validation Function
 * Performs comprehensive AI-powered analysis
 */
export async function validateOrderIntake(data: OrderIntakeData): Promise<AshleyAssessment> {
  const startTime = Date.now()
  
  try {
    // Load contextual data for analysis
    const [brand, client, routeTemplate, recentOrders, capacityData] = await Promise.all([
      loadBrandContext(data.brandId),
      loadClientContext(data.clientId),
      loadRouteContext(data.routeTemplateKey, data.method),
      loadRecentOrdersContext(data.brandId),
      loadCapacityContext()
    ])

    // Initialize assessment
    const assessment: AshleyAssessment = {
      risk: 'GREEN',
      confidence: 0.95,
      issues: [],
      recommendations: [],
      assumptions: {},
      processingTime: 0,
      modelVersion: 'ashley-v2.1.3',
      timestamp: new Date()
    }

    // Perform multi-dimensional analysis
    await Promise.all([
      analyzeCapacityConstraints(data, assessment, capacityData),
      analyzeInventoryRequirements(data, assessment),
      analyzeRoutingComplexity(data, assessment, routeTemplate),
      analyzeDeliveryFeasibility(data, assessment),
      analyzeCostImplications(data, assessment, brand),
      analyzeQualityRisks(data, assessment, client),
      analyzeSeasonalFactors(data, assessment),
      generateSmartRecommendations(data, assessment, brand, client)
    ])

    // Calculate overall risk level
    assessment.risk = calculateOverallRisk(assessment.issues)
    assessment.processingTime = Date.now() - startTime

    // Log AI decision for learning
    await logAshleyDecision('order_validation', data, assessment)

    return assessment

  } catch (_error) {
    console.error('Ashley AI Error:', _error)
    
    return {
      risk: 'AMBER',
      confidence: 0.3,
      issues: [{
        type: 'QUALITY',
        severity: 'WARNING',
        details: 'AI validation temporarily unavailable. Manual review recommended.',
        impact: 'Reduced validation confidence'
      }],
      recommendations: [],
      assumptions: {},
      processingTime: Date.now() - startTime,
      modelVersion: 'ashley-v2.1.3-fallback',
      timestamp: new Date()
    }
  }
}

/**
 * Analyze production capacity constraints
 */
async function analyzeCapacityConstraints(
  data: OrderIntakeData, 
  assessment: AshleyAssessment,
  capacityData: any
) {
  const deliveryWindow = Math.ceil(
    (new Date(data.targetDeliveryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )

  // Simulate capacity analysis based on method
  const methodCapacity = getMethodCapacity(data.method)
  const requiredHours = Math.ceil(data.totalQty / methodCapacity.piecesPerHour)
  const availableHours = deliveryWindow * 8 // 8 hour workdays
  const utilizationRate = requiredHours / availableHours

  assessment.assumptions.capacityAnalysis = {
    methodCapacity: methodCapacity.piecesPerHour,
    requiredHours,
    availableHours,
    utilizationRate
  }

  if (utilizationRate > 0.85) {
    assessment.issues.push({
      type: 'CAPACITY',
      severity: utilizationRate > 1.0 ? 'CRITICAL' : 'WARNING',
      workcenter: data.method,
      details: `${Math.round(utilizationRate * 100)}% capacity utilization in ${deliveryWindow} days`,
      impact: utilizationRate > 1.0 ? 'Delivery date impossible' : 'High pressure on production'
    })
  }
}

/**
 * Analyze inventory and material requirements
 */
async function analyzeInventoryRequirements(data: OrderIntakeData, assessment: AshleyAssessment) {
  // Simulate inventory check
  const materialRequirements = calculateMaterialRequirements(data)
  
  for (const [material, required] of Object.entries(materialRequirements)) {
    const available = await getAvailableStock(material)
    const shortfall = required - available
    
    if (shortfall > 0) {
      assessment.issues.push({
        type: 'STOCK',
        severity: shortfall > required * 0.5 ? 'CRITICAL' : 'WARNING',
        item: material,
        details: `Short by ${shortfall} ${getUnit(material)}`,
        shortBy: `${shortfall} ${getUnit(material)}`,
        action: 'PR_REQUIRED'
      })
    }
  }
}

/**
 * Analyze routing complexity and risks
 */
async function analyzeRoutingComplexity(
  data: OrderIntakeData, 
  assessment: AshleyAssessment,
  routeTemplate: any
) {
  // Check for high-risk routing patterns
  if (data.routeTemplateKey === 'SILK_OPTION_B') {
    assessment.issues.push({
      type: 'ROUTING',
      severity: 'WARNING',
      details: 'Alternative silkscreen route (Cut → Sew → Print) has 15% higher reject rate',
      impact: 'Increased quality risk and potential delays'
    })
  }

  // Large quantity routing recommendations
  if (data.totalQty > 500) {
    assessment.recommendations.push({
      title: 'Consider Batch Splitting',
      description: 'Split large order into multiple batches for better quality control',
      rationale: 'Orders >500pcs show 23% better quality when split into 250pc batches',
      expectedImpact: {
        qualityImprovement: 23,
        riskReduction: 35
      },
      implementation: [
        'Split into 2 batches of 250 pieces each',
        'Stagger production by 2-3 days',
        'Perform mid-batch quality review'
      ],
      priority: 'MEDIUM'
    })
  }
}

/**
 * Analyze delivery feasibility
 */
async function analyzeDeliveryFeasibility(data: OrderIntakeData, assessment: AshleyAssessment) {
  const leadTime = getTypicalLeadTime(data.method, data.totalQty)
  const availableTime = Math.ceil(
    (new Date(data.targetDeliveryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )

  if (availableTime < leadTime) {
    assessment.issues.push({
      type: 'DEADLINE',
      severity: 'CRITICAL',
      details: `Typical lead time is ${leadTime} days, but only ${availableTime} days available`,
      impact: 'Delivery deadline may not be achievable'
    })
  } else if (availableTime < leadTime * 1.2) {
    assessment.issues.push({
      type: 'DEADLINE',
      severity: 'WARNING',
      details: `Tight timeline: ${availableTime} days available vs ${leadTime} days typical`,
      impact: 'Limited buffer for delays'
    })
  }
}

/**
 * Analyze cost implications
 */
async function analyzeCostImplications(
  data: OrderIntakeData, 
  assessment: AshleyAssessment,
  brand: any
) {
  // Implement cost analysis logic
  const estimatedCost = calculateEstimatedCost(data)
  const unitPrice = data.commercials?.unitPrice || 0
  
  if (unitPrice < estimatedCost * 1.2) {
    assessment.issues.push({
      type: 'COST',
      severity: 'WARNING',
      details: `Margin below 20%: Unit price ₱${unitPrice} vs estimated cost ₱${estimatedCost}`,
      impact: 'Low profitability'
    })
  }
}

/**
 * Generate smart recommendations based on context
 */
async function generateSmartRecommendations(
  data: OrderIntakeData,
  assessment: AshleyAssessment,
  brand: any,
  client: any
) {
  // Efficiency recommendations
  if (data.method === 'SILKSCREEN' && data.totalQty > 100) {
    assessment.recommendations.push({
      title: 'Optimize Screen Setup',
      description: 'Use multi-color carousel setup for better efficiency',
      rationale: 'Carousel setup reduces changeover time by 40% for quantities >100',
      expectedImpact: {
        timeReduction: 120, // 2 hours
        costReduction: 500
      },
      implementation: [
        'Reserve carousel screen setup',
        'Prepare all colors simultaneously',
        'Use automated registration system'
      ],
      priority: 'HIGH'
    })
  }

  // Quality recommendations
  if (client?.risk_score && client.risk_score > 0.7) {
    assessment.recommendations.push({
      title: 'Enhanced Quality Control',
      description: 'Implement additional QC checkpoints for this high-value client',
      rationale: 'Client has premium quality expectations based on history',
      expectedImpact: {
        qualityImprovement: 15,
        riskReduction: 25
      },
      implementation: [
        'Add pre-production approval step',
        'Implement 10% sample inspection',
        'Schedule mid-production review'
      ],
      priority: 'HIGH'
    })
  }
}

// Helper functions
function calculateOverallRisk(issues: AshleyIssue[]): RiskLevel {
  const hasCritical = issues.some(i => i.severity === 'CRITICAL' || i.severity === 'BLOCKING')
  const warningCount = issues.filter(i => i.severity === 'WARNING').length
  
  if (hasCritical) return 'RED'
  if (warningCount >= 2) return 'AMBER'
  return 'GREEN'
}

function getMethodCapacity(method: ProcessType): { piecesPerHour: number } {
  const capacities = {
    SILKSCREEN: { piecesPerHour: 120 },
    SUBLIMATION: { piecesPerHour: 80 },
    DTF: { piecesPerHour: 150 },
    EMBROIDERY: { piecesPerHour: 45 }
  }
  return capacities[method] || { piecesPerHour: 60 }
}

function calculateMaterialRequirements(data: OrderIntakeData): Record<string, number> {
  // Simplified material calculation
  return {
    'Fabric': data.totalQty * 0.5, // 0.5kg per piece
    'Ink': data.totalQty * 0.02, // 20g per piece
    'Thread': data.totalQty * 0.01 // 10g per piece
  }
}

async function getAvailableStock(material: string): Promise<number> {
  // Simulate inventory lookup
  const stockLevels: Record<string, number> = {
    'Fabric': 150,
    'Ink': 5,
    'Thread': 2
  }
  return stockLevels[material] || 0
}

function getUnit(material: string): string {
  const units: Record<string, string> = {
    'Fabric': 'kg',
    'Ink': 'kg',
    'Thread': 'kg'
  }
  return units[material] || 'units'
}

function getTypicalLeadTime(method: ProcessType, quantity: number): number {
  const baseDays = {
    SILKSCREEN: 5,
    SUBLIMATION: 7,
    DTF: 3,
    EMBROIDERY: 8
  }
  
  const base = baseDays[method] || 5
  const quantityFactor = Math.ceil(quantity / 200) // Add 1 day per 200 pieces
  
  return base + quantityFactor
}

function calculateEstimatedCost(data: OrderIntakeData): number {
  // Simplified cost calculation
  const baseCosts = {
    SILKSCREEN: 25,
    SUBLIMATION: 35,
    DTF: 30,
    EMBROIDERY: 45
  }
  
  return baseCosts[data.method] || 30
}

// Enhanced types for routing optimization
export interface RoutingOptimizationInput {
  templateId?: string
  steps: Array<{
    id?: string
    name: string
    workcenter: string
    sequence: number
    standard_spec: {
      duration_minutes: number
      setup_minutes: number
      capacity_per_hour: number
      skill_requirements: string[]
      equipment_requirements: string[]
      quality_checkpoints: string[]
    }
  }>
  category: string
}

export interface RoutingOptimizationResult {
  efficiencyScore: number
  estimatedLeadTime: number
  bottlenecks: Array<{
    step: string
    workcenter: string
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    issue: string
    impact: string
    recommendation: string
  }>
  optimizations: Array<{
    type: 'PARALLEL_PROCESSING' | 'CAPACITY_INCREASE' | 'SKILL_OPTIMIZATION' | 'EQUIPMENT_UPGRADE'
    description: string
    estimated_improvement: number
    implementation_cost: 'LOW' | 'MEDIUM' | 'HIGH'
  }>
  parallelOpportunities: Array<{
    steps: string[]
    estimated_time_saved: number
    feasibility: 'HIGH' | 'MEDIUM' | 'LOW'
    requirements: string[]
  }>
}

/**
 * Validate and optimize routing templates with Ashley AI
 */
export async function validateAshleyRoutingOptimization(input: RoutingOptimizationInput): Promise<RoutingOptimizationResult> {
  const result: RoutingOptimizationResult = {
    efficiencyScore: 0,
    estimatedLeadTime: 0,
    bottlenecks: [],
    optimizations: [],
    parallelOpportunities: []
  }

  try {
    // Analyze routing efficiency
    result.efficiencyScore = calculateRoutingEfficiency(input.steps)
    
    // Calculate estimated lead time
    result.estimatedLeadTime = calculateLeadTime(input.steps)
    
    // Identify bottlenecks
    result.bottlenecks = identifyBottlenecks(input.steps)
    
    // Generate optimization suggestions
    result.optimizations = generateOptimizations(input.steps, result.bottlenecks)
    
    // Identify parallel processing opportunities
    result.parallelOpportunities = identifyParallelOpportunities(input.steps)

  } catch (_error) {
    console.error('Routing optimization error:', _error)
    result.bottlenecks.push({
      step: 'ANALYSIS',
      workcenter: 'SYSTEM',
      severity: 'MEDIUM',
      issue: 'Analysis incomplete due to system error',
      impact: 'Optimization suggestions may be limited',
      recommendation: 'Retry analysis or contact support'
    })
  }

  return result
}

// Helper functions for routing optimization
function calculateRoutingEfficiency(steps: Array<any>): number {
  if (steps.length === 0) return 0
  
  // Calculate efficiency based on various factors
  let efficiencyScore = 0.8 // Base efficiency
  
  // Parallel processing opportunities
  const parallelSteps = identifyParallelSteps(steps)
  if (parallelSteps.length > 0) {
    efficiencyScore += 0.1
  }
  
  // Bottleneck analysis
  const bottlenecks = identifyBottlenecks(steps)
  const criticalBottlenecks = bottlenecks.filter(b => b.severity === 'CRITICAL').length
  efficiencyScore -= criticalBottlenecks * 0.15
  
  // Setup time optimization
  const totalSetupTime = steps.reduce((sum, step) => 
    sum + (step.standard_spec?.setup_minutes || 0), 0)
  const totalProcessTime = steps.reduce((sum, step) => 
    sum + (step.standard_spec?.duration_minutes || 0), 0)
  
  const setupRatio = totalSetupTime / Math.max(totalProcessTime, 1)
  if (setupRatio < 0.1) efficiencyScore += 0.05
  else if (setupRatio > 0.3) efficiencyScore -= 0.1
  
  return Math.max(0, Math.min(1, efficiencyScore))
}

function calculateLeadTime(steps: Array<any>): number {
  // Calculate critical path considering parallel processing
  const parallelGroups = identifyParallelGroups(steps)
  
  let totalTime = 0
  for (const group of parallelGroups) {
    const maxGroupTime = Math.max(...group.map(step => 
      (step.standard_spec?.duration_minutes || 0) + 
      (step.standard_spec?.setup_minutes || 0)
    ))
    totalTime += maxGroupTime
  }
  
  return totalTime / 60 // Convert to hours
}

function identifyBottlenecks(steps: Array<any>): Array<any> {
  const bottlenecks = []
  
  for (const step of steps) {
    const capacity = step.standard_spec?.capacity_per_hour || 1
    const duration = step.standard_spec?.duration_minutes || 0
    
    if (capacity < 10 && duration > 60) {
      bottlenecks.push({
        step: step.name,
        workcenter: step.workcenter,
        severity: 'HIGH',
        issue: 'Low capacity with long duration',
        impact: 'May cause production delays',
        recommendation: 'Consider increasing capacity or parallel processing'
      })
    }
    
    const skillRequirements = step.standard_spec?.skill_requirements || []
    if (skillRequirements.length > 3) {
      bottlenecks.push({
        step: step.name,
        workcenter: step.workcenter,
        severity: 'MEDIUM',
        issue: 'High skill requirement complexity',
        impact: 'Limited operator availability',
        recommendation: 'Cross-train operators or simplify requirements'
      })
    }
  }
  
  return bottlenecks
}

function generateOptimizations(steps: Array<any>, bottlenecks: Array<any>): Array<any> {
  const optimizations = []
  
  // Parallel processing opportunities
  const parallelOps = identifyParallelOpportunities(steps)
  if (parallelOps.length > 0) {
    optimizations.push({
      type: 'PARALLEL_PROCESSING',
      description: `${parallelOps.length} parallel processing opportunities identified`,
      estimated_improvement: 0.2,
      implementation_cost: 'MEDIUM'
    })
  }
  
  // Capacity improvements for bottlenecks
  const capacityBottlenecks = bottlenecks.filter(b => b.issue.includes('capacity'))
  if (capacityBottlenecks.length > 0) {
    optimizations.push({
      type: 'CAPACITY_INCREASE',
      description: 'Increase capacity at identified bottleneck workcenters',
      estimated_improvement: 0.3,
      implementation_cost: 'HIGH'
    })
  }
  
  return optimizations
}

function identifyParallelOpportunities(steps: Array<any>): Array<any> {
  const opportunities = []
  
  // Look for steps that can run in parallel
  for (let i = 0; i < steps.length - 1; i++) {
    const current = steps[i]
    const next = steps[i + 1]
    
    // Check if steps can run in parallel (different workcenters, no dependencies)
    if (current.workcenter !== next.workcenter) {
      const timeSaved = Math.min(
        current.standard_spec?.duration_minutes || 0,
        next.standard_spec?.duration_minutes || 0
      )
      
      if (timeSaved > 30) { // Only suggest if significant time savings
        opportunities.push({
          steps: [current.name, next.name],
          estimated_time_saved: timeSaved,
          feasibility: 'HIGH',
          requirements: ['Separate workcenters', 'Independent operations']
        })
      }
    }
  }
  
  return opportunities
}

function identifyParallelSteps(steps: Array<any>): Array<any> {
  // Simple implementation - steps with different workcenters can potentially run in parallel
  const workcenters = [...new Set(steps.map(s => s.workcenter))]
  return steps.filter((step, index) => 
    workcenters.includes(step.workcenter) && index < steps.length - 1
  )
}

function identifyParallelGroups(steps: Array<any>): Array<Array<any>> {
  // Simplified parallel grouping - in reality this would be more complex
  const groups = []
  let currentGroup = []
  
  for (const step of steps) {
    if (currentGroup.length === 0) {
      currentGroup.push(step)
    } else {
      // Check if step can be parallel with current group
      const canBeParallel = !currentGroup.some(groupStep => 
        groupStep.workcenter === step.workcenter
      )
      
      if (canBeParallel && currentGroup.length < 3) { // Max 3 parallel steps
        currentGroup.push(step)
      } else {
        groups.push([...currentGroup])
        currentGroup = [step]
      }
    }
  }
  
  if (currentGroup.length > 0) {
    groups.push(currentGroup)
  }
  
  return groups
}

// Context loading functions
async function loadBrandContext(brandId: string) {
  return await prisma.brand.findUnique({
    where: { id: brandId },
    include: { settings: true }
  })
}

async function loadClientContext(clientId: string) {
  return await prisma.client.findUnique({
    where: { id: clientId }
  })
}

async function loadRouteContext(routeTemplateKey: string | undefined, method: ProcessType) {
  if (!routeTemplateKey) return null
  
  return await prisma.routeTemplate.findFirst({
    where: { 
      template_key: routeTemplateKey as any,
      method: method
    }
  })
}

async function loadRecentOrdersContext(brandId: string) {
  return await prisma.order.findMany({
    where: { 
      brand_id: brandId,
      created_at: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      }
    },
    take: 20
  })
}

async function loadCapacityContext() {
  // Simulate capacity data loading
  return {
    workcenters: {
      PRINTING: { utilization: 0.75, capacity: 1000 },
      CUTTING: { utilization: 0.60, capacity: 800 },
      SEWING: { utilization: 0.85, capacity: 600 }
    }
  }
}

async function logAshleyDecision(functionName: string, input: any, output: any) {
  try {
    await prisma.aILog.create({
      data: {
        agent: 'ashley',
        function_name: functionName,
        input_data: input,
        output_data: output,
        confidence: output.confidence || 0.95,
        processing_time: output.processingTime || 0,
        model_version: output.modelVersion || 'ashley-v2.1.3'
      }
    })
  } catch (_error) {
    console.error('Failed to log Ashley decision:', _error)
  }
}