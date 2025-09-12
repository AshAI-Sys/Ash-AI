// @ts-nocheck
// ASH AI - Routing Template Engine
// Based on CLIENT_UPDATED_PLAN.md Stage 1 specification

export interface RoutingStep {
  id: string
  name: string
  estimatedHours: number
  requiredSkills: string[]
  dependencies: string[]
  department: 'CUTTING' | 'PRINTING' | 'SEWING' | 'QC' | 'FINISHING' | 'DESIGN' | 'PACKAGING'
  capacity: number // units per hour
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
  }
]

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
}

export const routingEngine = new RoutingEngine()