// @ts-nocheck
// ASH AI - Routing Template Engine
// Based on CLIENT_UPDATED_PLAN.md Stage 1 specification

export interface RoutingStep {
  id: string
  name: string
  estimatedHours: number
  requiredSkills: string[]
  dependencies: string[]
  join_type?: 'AND' | 'OR' | null // For parallel workflow joins
  department: 'CUTTING' | 'PRINTING' | 'SEWING' | 'QC' | 'FINISHING' | 'DESIGN' | 'PACKAGING'
  capacity: number // units per hour
  can_run_parallel?: boolean // Can run in parallel with other steps
  standard_spec?: any // Default specifications for the step
  expected_inputs?: any // Input requirements
  expected_outputs?: any // Output specifications
  qualityCheckpoints?: string[]
  materials?: string[]
  equipment?: string[]
}

export interface RoutingTemplate {
  id: string
  name: string
  method: 'Silkscreen' | 'Sublimation' | 'DTF' | 'Embroidery'
  productTypes: string[]
  steps: RoutingStep[]
  minQuantity?: number
  maxQuantity?: number
  complexity: 'LOW' | 'MEDIUM' | 'HIGH'
  riskFactors: string[]
  ashleyRecommendation: 'OPTIMAL' | 'SUITABLE' | 'CAUTION' | 'NOT_RECOMMENDED'
}

export interface OrderContext {
  productType: string
  method: string
  quantity: number
  target_delivery_date: Date
  brand_id: string
  hasComplexDesign?: boolean
  isPriority?: boolean
}

export interface CriticalPath {
  totalEstimatedHours: number
  estimatedDeliveryDate: Date
  bottleneckSteps: string[]
  bufferHours: number
  feasible: boolean
  risks: string[]
}

// Core routing templates based on CLIENT_UPDATED_PLAN.md
export const ROUTING_TEMPLATES: RoutingTemplate[] = [
  {
    id: 'SILK_CUT_PRINT_SEW',
    name: 'Cut → Screen → Print → Sew → QC → Pack',
    method: 'Silkscreen',
    productTypes: ['T-Shirt', 'Hoodie', 'Jersey', 'Uniform'],
    complexity: 'MEDIUM',
    riskFactors: ['Screen preparation time', 'Ink curing requirements'],
    ashleyRecommendation: 'OPTIMAL',
    steps: [
      {
        id: 'cutting',
        name: 'Pattern Cutting & Bundling',
        estimatedHours: 4,
        requiredSkills: ['Pattern Reading', 'Cutting Machine Operation'],
        dependencies: [],
        department: 'CUTTING',
        capacity: 50, // pieces per hour
        qualityCheckpoints: ['Size accuracy', 'Fabric inspection'],
        materials: ['Fabric', 'Pattern paper', 'Bundle tags'],
        equipment: ['Cutting machine', 'Spreading table']
      },
      {
        id: 'screen_making',
        name: 'Screen Preparation & Setup',
        estimatedHours: 6,
        requiredSkills: ['Screen Making', 'Emulsion Coating'],
        dependencies: [],
        department: 'DESIGN',
        capacity: 4, // screens per hour
        qualityCheckpoints: ['Screen tension', 'Image resolution', 'Registration marks'],
        materials: ['Screen mesh', 'Emulsion', 'Photo film'],
        equipment: ['Screen frames', 'Coating trough', 'Exposure unit']
      },
      {
        id: 'printing',
        name: 'Silkscreen Printing',
        estimatedHours: 8,
        requiredSkills: ['Screen Printing', 'Color Matching', 'Registration'],
        dependencies: ['cutting', 'screen_making'],
        department: 'PRINTING',
        capacity: 25, // pieces per hour
        qualityCheckpoints: ['Print alignment', 'Color accuracy', 'Ink coverage'],
        materials: ['Plastisol ink', 'Squeegees', 'Cleaning solvents'],
        equipment: ['Manual press', 'Conveyor dryer', 'Flash cure unit']
      },
      {
        id: 'sewing',
        name: 'Garment Assembly',
        estimatedHours: 12,
        requiredSkills: ['Overlock Operation', 'Flat Seaming', 'Quality Sewing'],
        dependencies: ['printing'],
        department: 'SEWING',
        capacity: 8, // pieces per hour
        qualityCheckpoints: ['Seam strength', 'Stitch consistency', 'Thread tension'],
        materials: ['Thread', 'Labels', 'Care tags'],
        equipment: ['Overlock machines', 'Flat seaming machines', 'Button holer']
      },
      {
        id: 'quality_control',
        name: 'Final Quality Inspection',
        estimatedHours: 3,
        requiredSkills: ['Quality Inspection', 'Defect Classification'],
        dependencies: ['sewing'],
        department: 'QC',
        capacity: 30, // pieces per hour
        qualityCheckpoints: ['Overall appearance', 'Size measurements', 'Print durability'],
        materials: ['Inspection forms', 'Measuring tools'],
        equipment: ['Inspection table', 'Light box', 'Measuring equipment']
      },
      {
        id: 'packing',
        name: 'Final Packing & Labeling',
        estimatedHours: 2,
        requiredSkills: ['Packing', 'Inventory Management'],
        dependencies: ['quality_control'],
        department: 'PACKAGING',
        capacity: 40, // pieces per hour
        qualityCheckpoints: ['Pack completeness', 'Label accuracy'],
        materials: ['Poly bags', 'Cartons', 'Shipping labels'],
        equipment: ['Sealing machine', 'Label printer', 'Scale']
      }
    ]
  },
  {
    id: 'SUBLIMATION_FULL',
    name: 'GA → Print → Heat Press → Cut → Sew → QC → Pack',
    method: 'Sublimation',
    productTypes: ['Jersey', 'Sportswear', 'All-over Print'],
    complexity: 'HIGH',
    riskFactors: ['Color bleeding', 'Heat press timing', 'Polyester fabric requirement'],
    ashleyRecommendation: 'OPTIMAL',
    steps: [
      {
        id: 'graphic_arts',
        name: 'Design Preparation & Color Separation',
        estimatedHours: 8,
        requiredSkills: ['Graphic Design', 'Color Management', 'RIP Software'],
        dependencies: [],
        department: 'DESIGN',
        capacity: 2, // designs per hour
        qualityCheckpoints: ['Color accuracy', 'Resolution check', 'Print area optimization'],
        materials: ['Design files', 'Color profiles'],
        equipment: ['Design workstation', 'Color calibrated monitor', 'RIP software']
      },
      {
        id: 'sublimation_print',
        name: 'Sublimation Paper Printing',
        estimatedHours: 6,
        requiredSkills: ['Large Format Printing', 'Color Management'],
        dependencies: ['graphic_arts'],
        department: 'PRINTING',
        capacity: 10, // prints per hour
        qualityCheckpoints: ['Print quality', 'Color saturation', 'Registration marks'],
        materials: ['Sublimation paper', 'Sublimation ink'],
        equipment: ['Wide format printer', 'RIP software']
      },
      {
        id: 'heat_press',
        name: 'Heat Transfer Application',
        estimatedHours: 10,
        requiredSkills: ['Heat Press Operation', 'Temperature Control'],
        dependencies: ['sublimation_print'],
        department: 'PRINTING',
        capacity: 8, // pieces per hour
        qualityCheckpoints: ['Transfer completeness', 'No ghosting', 'Color vibrancy'],
        materials: ['Protective paper', 'Adhesive spray'],
        equipment: ['Calendar heat press', 'Temperature controller', 'Conveyor system']
      },
      {
        id: 'cutting_post_print',
        name: 'Pattern Cutting Post-Print',
        estimatedHours: 4,
        requiredSkills: ['Pattern Cutting', 'Print Alignment'],
        dependencies: ['heat_press'],
        department: 'CUTTING',
        capacity: 30, // pieces per hour
        qualityCheckpoints: ['Cut accuracy', 'Pattern matching', 'Minimal waste'],
        materials: ['Cut patterns', 'Bundle tags'],
        equipment: ['Cutting table', 'Rotary cutters', 'Rulers']
      },
      {
        id: 'sewing_sublimation',
        name: 'Garment Assembly (Sublimated)',
        estimatedHours: 14,
        requiredSkills: ['Athletic Wear Sewing', 'Stretch Fabric Handling'],
        dependencies: ['cutting_post_print'],
        department: 'SEWING',
        capacity: 6, // pieces per hour
        qualityCheckpoints: ['Seam elasticity', 'Pattern alignment', 'Fit check'],
        materials: ['Stretch thread', 'Elastic tape', 'Performance labels'],
        equipment: ['Coverstitch machines', 'Overlock machines', 'Twin needle machines']
      },
      {
        id: 'quality_control_sub',
        name: 'Sublimation Quality Control',
        estimatedHours: 3,
        requiredSkills: ['Quality Inspection', 'Color Fastness Testing'],
        dependencies: ['sewing_sublimation'],
        department: 'QC',
        capacity: 25, // pieces per hour
        qualityCheckpoints: ['Color fastness', 'Wash test', 'Stretch recovery'],
        materials: ['Test equipment', 'Wash samples'],
        equipment: ['Light box', 'Stretch tester', 'Wash testing equipment']
      },
      {
        id: 'packing_sub',
        name: 'Athletic Wear Packing',
        estimatedHours: 2,
        requiredSkills: ['Sports Apparel Packing'],
        dependencies: ['quality_control_sub'],
        department: 'PACKAGING',
        capacity: 35, // pieces per hour
        qualityCheckpoints: ['Size sorting', 'Care instruction inclusion'],
        materials: ['Premium poly bags', 'Care cards', 'Brand tags'],
        equipment: ['Folding boards', 'Heat sealer']
      }
    ]
  },
  {
    id: 'DTF_EXPRESS',
    name: 'Receive Plain → DTF → Heat Press → QC → Pack',
    method: 'DTF',
    productTypes: ['T-Shirt', 'Hoodie', 'Existing Garments'],
    complexity: 'LOW',
    riskFactors: ['Film adhesion', 'Heat press temperature'],
    ashleyRecommendation: 'OPTIMAL',
    steps: [
      {
        id: 'dtf_design_prep',
        name: 'DTF Design Preparation',
        estimatedHours: 2,
        requiredSkills: ['DTF Design Setup', 'File Optimization'],
        dependencies: [],
        department: 'DESIGN',
        capacity: 8, // designs per hour
        qualityCheckpoints: ['File resolution', 'Color separation', 'Size accuracy'],
        materials: ['Design files'],
        equipment: ['RIP software', 'Design workstation']
      },
      {
        id: 'dtf_printing',
        name: 'DTF Film Printing',
        estimatedHours: 4,
        requiredSkills: ['DTF Printing', 'Ink Management'],
        dependencies: ['dtf_design_prep'],
        department: 'PRINTING',
        capacity: 20, // prints per hour
        qualityCheckpoints: ['Print quality', 'Ink saturation', 'Film integrity'],
        materials: ['DTF film', 'DTF ink', 'Adhesive powder'],
        equipment: ['DTF printer', 'Powder shaker', 'Curing oven']
      },
      {
        id: 'dtf_application',
        name: 'DTF Heat Press Application',
        estimatedHours: 6,
        requiredSkills: ['Heat Press Operation', 'DTF Application'],
        dependencies: ['dtf_printing'],
        department: 'PRINTING',
        capacity: 15, // pieces per hour
        qualityCheckpoints: ['Adhesion quality', 'No bubbles', 'Complete transfer'],
        materials: ['Plain garments', 'Protective sheets'],
        equipment: ['Heat press machine', 'Teflon sheets', 'Timer']
      },
      {
        id: 'dtf_qc',
        name: 'DTF Quality Control',
        estimatedHours: 1.5,
        requiredSkills: ['Quality Inspection', 'Adhesion Testing'],
        dependencies: ['dtf_application'],
        department: 'QC',
        capacity: 40, // pieces per hour
        qualityCheckpoints: ['Transfer adhesion', 'Color accuracy', 'Edge integrity'],
        materials: ['Test materials'],
        equipment: ['Adhesion tester', 'Light box']
      },
      {
        id: 'dtf_packing',
        name: 'DTF Garment Packing',
        estimatedHours: 1,
        requiredSkills: ['Basic Packing'],
        dependencies: ['dtf_qc'],
        department: 'PACKAGING',
        capacity: 50, // pieces per hour
        qualityCheckpoints: ['Size accuracy', 'Care instructions'],
        materials: ['Poly bags', 'Care labels'],
        equipment: ['Folding equipment', 'Sealing machine']
      }
    ]
  },
  {
    id: 'COMPLEX_PARALLEL_SEWING',
    name: 'Cut → [Sleeves || Collars] → Final Assembly → QC → Pack',
    method: 'Silkscreen',
    productTypes: ['Hoodie', 'Uniform'],
    complexity: 'HIGH',
    riskFactors: ['Parallel coordination', 'Sub-assembly timing'],
    ashleyRecommendation: 'SUITABLE',
    steps: [
      {
        id: 'cutting_complex',
        name: 'Pattern Cutting & Component Separation',
        estimatedHours: 6,
        requiredSkills: ['Advanced Pattern Reading', 'Component Cutting'],
        dependencies: [],
        department: 'CUTTING',
        capacity: 30,
        can_run_parallel: false,
        expected_outputs: { main_panels: true, sleeve_panels: true, collar_pieces: true }
      },
      {
        id: 'sleeve_assembly',
        name: 'Sleeve Sub-Assembly',
        estimatedHours: 8,
        requiredSkills: ['Sleeve Construction', 'Set-in Sleeves'],
        dependencies: ['cutting_complex'],
        department: 'SEWING',
        capacity: 12,
        can_run_parallel: true,
        expected_inputs: { sleeve_panels: true },
        expected_outputs: { finished_sleeves: true }
      },
      {
        id: 'collar_assembly',
        name: 'Collar Sub-Assembly',
        estimatedHours: 6,
        requiredSkills: ['Collar Construction', 'Interfacing'],
        dependencies: ['cutting_complex'],
        department: 'SEWING',
        capacity: 15,
        can_run_parallel: true,
        expected_inputs: { collar_pieces: true },
        expected_outputs: { finished_collars: true }
      },
      {
        id: 'final_assembly',
        name: 'Final Garment Assembly',
        estimatedHours: 10,
        requiredSkills: ['Advanced Sewing', 'Quality Assembly'],
        dependencies: ['sleeve_assembly', 'collar_assembly'],
        join_type: 'AND', // Requires BOTH sub-assemblies complete
        department: 'SEWING',
        capacity: 8,
        can_run_parallel: false,
        expected_inputs: { main_panels: true, finished_sleeves: true, finished_collars: true },
        expected_outputs: { complete_garment: true }
      },
      {
        id: 'complex_qc',
        name: 'Complex Garment QC',
        estimatedHours: 4,
        requiredSkills: ['Advanced QC', 'Construction Inspection'],
        dependencies: ['final_assembly'],
        department: 'QC',
        capacity: 20
      },
      {
        id: 'complex_packing',
        name: 'Premium Packing',
        estimatedHours: 2,
        requiredSkills: ['Premium Packing'],
        dependencies: ['complex_qc'],
        department: 'PACKAGING',
        capacity: 25
      }
    ]
  }
]

export interface ParallelSchedule {
  step_id: string
  start_time: Date
  end_time: Date
  assigned_resources: string[]
  parallel_lane: number
}

export interface AdvancedCriticalPath extends CriticalPath {
  parallel_schedule: ParallelSchedule[]
  resource_conflicts: string[]
  optimization_suggestions: string[]
  critical_path_steps: string[]
}

export class RoutingEngine {
  private templates: RoutingTemplate[] = ROUTING_TEMPLATES

  getTemplatesForOrder(context: OrderContext): RoutingTemplate[] {
    return this.templates.filter(template => {
      // Method match
      if (template.method !== context.method) return false
      
      // Product type compatibility
      if (!template.productTypes.includes(context.productType)) return false
      
      // Quantity constraints
      if (template.minQuantity && context.quantity < template.minQuantity) return false
      if (template.maxQuantity && context.quantity > template.maxQuantity) return false
      
      return true
    })
  }

  calculateCriticalPath(template: RoutingTemplate, quantity: number, targetDate: Date): CriticalPath {
    let totalHours = 0
    const bottlenecks: string[] = []
    const risks: string[] = []
    
    // Calculate total production time considering capacity constraints
    for (const step of template.steps) {
      const stepHours = Math.max(
        step.estimatedHours, // Base time
        quantity / step.capacity // Capacity-based time
      )
      
      totalHours += stepHours
      
      // Identify bottlenecks (steps taking longer than base estimate)
      if (stepHours > step.estimatedHours * 1.2) {
        bottlenecks.push(step.name)
      }
    }
    
    // Add buffer time (20% of total)
    const bufferHours = totalHours * 0.2
    const totalWithBuffer = totalHours + bufferHours
    
    // Calculate estimated delivery
    const hoursPerDay = 8 // Standard work day
    const workDays = Math.ceil(totalWithBuffer / hoursPerDay)
    const estimatedDelivery = new Date()
    estimatedDelivery.setDate(estimatedDelivery.getDate() + workDays)
    
    // Check feasibility
    const feasible = estimatedDelivery <= targetDate
    
    // Add template-specific risks
    risks.push(...template.riskFactors)
    
    // Add quantity-based risks
    if (quantity > 500) {
      risks.push('High volume may strain capacity')
    }
    
    if (!feasible) {
      risks.push(`Delivery date not achievable - need ${workDays} days, have ${Math.ceil((new Date(targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days`)
    }
    
    return {
      totalEstimatedHours: totalHours,
      estimatedDeliveryDate: estimatedDelivery,
      bottleneckSteps: bottlenecks,
      bufferHours,
      feasible,
      risks
    }
  }

  getAshleyRecommendation(context: OrderContext): {
    recommendedTemplate: RoutingTemplate | null
    insights: string[]
    warnings: string[]
  } {
    const availableTemplates = this.getTemplatesForOrder(context)
    const insights: string[] = []
    const warnings: string[] = []
    
    if (availableTemplates.length === 0) {
      warnings.push('No suitable routing templates found for this order configuration')
      return { recommendedTemplate: null, insights, warnings }
    }
    
    // Find optimal template
    const optimal = availableTemplates.find(t => t.ashleyRecommendation === 'OPTIMAL')
    const recommended = optimal || availableTemplates.find(t => t.ashleyRecommendation === 'SUITABLE')
    
    // Generate insights based on order characteristics
    if (context.quantity > 200) {
      insights.push('Large quantity order - consider batch processing for better quality control')
    }
    
    if (context.method === 'Silkscreen' && context.quantity < 50) {
      insights.push('Small quantity silkscreen - DTF may be more cost-effective')
    }
    
    if (context.method === 'Sublimation' && context.productType === 'T-Shirt') {
      warnings.push('Sublimation requires 100% polyester - ensure fabric compatibility')
    }
    
    // Timeline warnings
    const _targetDate = new Date(context.target_delivery_date)
    const _daysAvailable = Math.ceil((_targetDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    
    if (recommended) {
      const criticalPath = this.calculateCriticalPath(recommended, context.quantity, _targetDate)
      
      if (!criticalPath.feasible) {
        warnings.push(`Tight deadline - recommend expediting or splitting into batches`)
      }
      
      if (criticalPath.bottleneckSteps.length > 0) {
        insights.push(`Potential bottlenecks: ${criticalPath.bottleneckSteps.join(', ')}`)
      }
    }
    
    return {
      recommendedTemplate: recommended || null,
      insights,
      warnings
    }
  }

  // Advanced parallel processing with dependency resolution
  calculateAdvancedCriticalPath(template: RoutingTemplate, quantity: number, targetDate: Date): AdvancedCriticalPath {
    const steps = template.steps
    const stepMap = new Map(steps.map(step => [step.id, step]))
    const completed = new Set<string>()
    const inProgress = new Map<string, { start: Date, end: Date }>()
    const parallelSchedule: ParallelSchedule[] = []
    const resourceConflicts: string[] = []
    const optimizationSuggestions: string[] = []

    let currentTime = new Date()
    const workHoursPerDay = 8

    // Build dependency graph
    const dependencyGraph = new Map<string, string[]>()
    const reverseDependencies = new Map<string, string[]>()

    for (const step of steps) {
      dependencyGraph.set(step.id, step.dependencies)
      for (const dep of step.dependencies) {
        if (!reverseDependencies.has(dep)) {
          reverseDependencies.set(dep, [])
        }
        reverseDependencies.get(dep)!.push(step.id)
      }
    }

    // Find steps that can be executed (no pending dependencies)
    const getReadySteps = (): RoutingStep[] => {
      return steps.filter(step => {
        if (completed.has(step.id) || inProgress.has(step.id)) return false

        // Check if all dependencies are completed
        return step.dependencies.every(dep => completed.has(dep))
      })
    }

    // Process steps using topological sort with parallel execution
    let parallelLane = 0

    while (completed.size < steps.length) {
      const readySteps = getReadySteps()

      if (readySteps.length === 0) {
        // Check for circular dependencies or waiting for in-progress steps
        const waitingSteps = steps.filter(step =>
          !completed.has(step.id) && !inProgress.has(step.id)
        )

        if (waitingSteps.length > 0 && inProgress.size > 0) {
          // Wait for in-progress steps to complete
          const nextCompletion = Math.min(...Array.from(inProgress.values()).map(p => p.end.getTime()))
          currentTime = new Date(nextCompletion)

          // Mark completed steps
          for (const [stepId, progress] of inProgress.entries()) {
            if (progress.end.getTime() <= currentTime.getTime()) {
              completed.add(stepId)
              inProgress.delete(stepId)
            }
          }
          continue
        } else {
          // Circular dependency or other issue
          resourceConflicts.push('Circular dependency detected or scheduling conflict')
          break
        }
      }

      // Group steps that can run in parallel
      const parallelGroups = this.groupParallelSteps(readySteps)

      for (const group of parallelGroups) {
        for (const step of group) {
          const stepDuration = Math.max(
            step.estimatedHours,
            quantity / step.capacity
          )

          // Convert hours to actual time (considering work days)
          const stepDurationMs = stepDuration * 60 * 60 * 1000 // Convert to milliseconds
          const endTime = new Date(currentTime.getTime() + stepDurationMs)

          // Schedule the step
          parallelSchedule.push({
            step_id: step.id,
            start_time: new Date(currentTime),
            end_time: endTime,
            assigned_resources: [step.department],
            parallel_lane: parallelLane
          })

          inProgress.set(step.id, { start: new Date(currentTime), end: endTime })

          // Check for resource conflicts
          const conflictingSteps = parallelSchedule.filter(ps =>
            ps.step_id !== step.id &&
            ps.assigned_resources.some(r => step.department === r) &&
            ps.start_time < endTime && ps.end_time > currentTime
          )

          if (conflictingSteps.length > 0) {
            resourceConflicts.push(`Resource conflict: ${step.department} overbooked during ${step.name}`)
          }
        }
        parallelLane++
      }

      // Move to next time point
      if (inProgress.size > 0) {
        const nextCompletion = Math.min(...Array.from(inProgress.values()).map(p => p.end.getTime()))
        currentTime = new Date(nextCompletion)

        // Mark completed steps
        for (const [stepId, progress] of inProgress.entries()) {
          if (progress.end.getTime() <= currentTime.getTime()) {
            completed.add(stepId)
            inProgress.delete(stepId)
          }
        }
      }
    }

    // Calculate critical path
    const criticalPathSteps = this.findCriticalPath(steps, parallelSchedule)

    // Generate optimization suggestions
    if (resourceConflicts.length > 0) {
      optimizationSuggestions.push('Consider adding additional capacity to overbooked departments')
    }

    const parallelOpportunities = steps.filter(step => step.can_run_parallel &&
      !parallelSchedule.some(ps => ps.step_id === step.id && ps.parallel_lane > 0)
    )

    if (parallelOpportunities.length > 0) {
      optimizationSuggestions.push(`Additional parallelization possible for: ${parallelOpportunities.map(s => s.name).join(', ')}`)
    }

    // Calculate final metrics
    const totalHours = Math.max(...parallelSchedule.map(ps => ps.end_time.getTime())) -
                      Math.min(...parallelSchedule.map(ps => ps.start_time.getTime()))
    const totalHoursDecimal = totalHours / (1000 * 60 * 60)

    const bufferHours = totalHoursDecimal * 0.2
    const estimatedDeliveryDate = new Date(Math.max(...parallelSchedule.map(ps => ps.end_time.getTime())) + (bufferHours * 60 * 60 * 1000))

    const feasible = estimatedDeliveryDate <= targetDate
    const risks = [...template.riskFactors]

    if (!feasible) {
      risks.push('Delivery date not achievable with current parallel schedule')
    }

    return {
      totalEstimatedHours: totalHoursDecimal,
      estimatedDeliveryDate,
      bottleneckSteps: this.findBottlenecks(parallelSchedule, steps),
      bufferHours,
      feasible,
      risks,
      parallel_schedule: parallelSchedule,
      resource_conflicts: resourceConflicts,
      optimization_suggestions: optimizationSuggestions,
      critical_path_steps: criticalPathSteps
    }
  }

  private groupParallelSteps(steps: RoutingStep[]): RoutingStep[][] {
    const groups: RoutingStep[][] = []
    const used = new Set<string>()

    for (const step of steps) {
      if (used.has(step.id)) continue

      if (step.can_run_parallel) {
        // Find other steps that can run in parallel
        const parallelGroup = steps.filter(s =>
          !used.has(s.id) &&
          s.can_run_parallel &&
          s.department !== step.department // Different departments can run in parallel
        )

        parallelGroup.forEach(s => used.add(s.id))
        groups.push(parallelGroup)
      } else {
        groups.push([step])
        used.add(step.id)
      }
    }

    return groups
  }

  private findCriticalPath(steps: RoutingStep[], schedule: ParallelSchedule[]): string[] {
    // Find the longest path through the dependency graph
    const stepMap = new Map(steps.map(step => [step.id, step]))
    const scheduleMap = new Map(schedule.map(ps => [ps.step_id, ps]))

    // Start from steps with no dependencies
    const startSteps = steps.filter(step => step.dependencies.length === 0)

    let longestPath: string[] = []
    let longestDuration = 0

    const findLongestPath = (stepId: string, currentPath: string[], currentDuration: number): void => {
      const step = stepMap.get(stepId)!
      const stepSchedule = scheduleMap.get(stepId)!

      const newPath = [...currentPath, stepId]
      const newDuration = currentDuration + (stepSchedule.end_time.getTime() - stepSchedule.start_time.getTime())

      // Find dependent steps
      const dependentSteps = steps.filter(s => s.dependencies.includes(stepId))

      if (dependentSteps.length === 0) {
        // End of path
        if (newDuration > longestDuration) {
          longestDuration = newDuration
          longestPath = newPath
        }
      } else {
        // Continue path exploration
        for (const depStep of dependentSteps) {
          findLongestPath(depStep.id, newPath, newDuration)
        }
      }
    }

    for (const startStep of startSteps) {
      findLongestPath(startStep.id, [], 0)
    }

    return longestPath
  }

  private findBottlenecks(schedule: ParallelSchedule[], steps: RoutingStep[]): string[] {
    const stepMap = new Map(steps.map(step => [step.id, step]))
    const bottlenecks: string[] = []

    for (const ps of schedule) {
      const step = stepMap.get(ps.step_id)!
      const plannedDuration = ps.end_time.getTime() - ps.start_time.getTime()
      const estimatedDurationMs = step.estimatedHours * 60 * 60 * 1000

      // If actual duration is significantly longer than estimated, it's a bottleneck
      if (plannedDuration > estimatedDurationMs * 1.3) {
        bottlenecks.push(step.name)
      }
    }

    return bottlenecks
  }

  // Template management methods
  addCustomTemplate(template: RoutingTemplate): void {
    // Validate template
    if (!template.id || !template.name || !template.steps || template.steps.length === 0) {
      throw new Error('Invalid template: missing required fields')
    }

    // Check for circular dependencies
    if (this.hasCircularDependencies(template.steps)) {
      throw new Error('Invalid template: circular dependencies detected')
    }

    this.templates.push(template)
  }

  private hasCircularDependencies(steps: RoutingStep[]): boolean {
    const visited = new Set<string>()
    const recursionStack = new Set<string>()

    const hasCycle = (stepId: string, stepMap: Map<string, RoutingStep>): boolean => {
      if (recursionStack.has(stepId)) return true
      if (visited.has(stepId)) return false

      visited.add(stepId)
      recursionStack.add(stepId)

      const step = stepMap.get(stepId)
      if (step) {
        for (const dep of step.dependencies) {
          if (hasCycle(dep, stepMap)) return true
        }
      }

      recursionStack.delete(stepId)
      return false
    }

    const stepMap = new Map(steps.map(step => [step.id, step]))

    for (const step of steps) {
      if (hasCycle(step.id, stepMap)) {
        return true
      }
    }

    return false
  }

  updateTemplate(templateId: string, updates: Partial<RoutingTemplate>): void {
    const index = this.templates.findIndex(t => t.id === templateId)
    if (index === -1) {
      throw new Error('Template not found')
    }

    const updatedTemplate = { ...this.templates[index], ...updates }

    // Validate updated template
    if (updatedTemplate.steps && this.hasCircularDependencies(updatedTemplate.steps)) {
      throw new Error('Update rejected: would create circular dependencies')
    }

    this.templates[index] = updatedTemplate
  }

  deleteTemplate(templateId: string): void {
    const index = this.templates.findIndex(t => t.id === templateId)
    if (index === -1) {
      throw new Error('Template not found')
    }

    this.templates.splice(index, 1)
  }

  getAllTemplates(): RoutingTemplate[] {
    return [...this.templates]
  }
}

export const routingEngine = new RoutingEngine()