// @ts-nocheck
import { prisma } from '@/lib/db'
import { PrintMethod, Prisma } from '@prisma/client'

export interface RoutingStep {
  name: string
  workcenter: string
  sequence: number
  dependsOn?: string[]
  joinType?: string
  standard_spec?: Record<string, any>
  expectedInputs?: Record<string, any>
  expectedOutputs?: Record<string, any>
  canRunParallel?: boolean
  estimatedMinutes?: number
}

export class RoutingTemplateService {
  /**
   * Get default routing template for a method/brand combination
   */
  static getDefaultTemplate(method: PrintMethod, brand_id: string): string {
    const brandPrefix = brand_id.substring(0, 4).toUpperCase()
    
    switch (method) {
      case PrintMethod.SILKSCREEN:
        return 'SILK_OPTION_A' // Default: Cut → Print → Sew → QC → Pack
      case PrintMethod.SUBLIMATION:
        return 'SUBL_DEFAULT' // GA → Print → Heat Press → Cut → Sew → QC → Pack
      case PrintMethod.DTF:
        return 'DTF_DEFAULT' // Receive Plain Tee → DTF → QC → Pack
      case PrintMethod.EMBROIDERY:
        return 'EMB_DEFAULT' // Cut → Emb → Sew → QC → Pack
      default:
        return 'SILK_OPTION_A'
    }
  }

  /**
   * Create routing steps from template
   */
  static async createRoutingSteps(
    tx: Prisma.TransactionClient,
    order_id: string,
    template: any,
    targetDate?: Date
  ): Promise<any[]> {
    const templateSteps = template.steps as RoutingStep[]
    const steps = []

    // Calculate timing if target date provided
    let currentDate = new Date()
    const totalEstimatedMinutes = templateSteps.reduce(
      (sum, step) => sum + (step.estimatedMinutes || 60), 0
    )
    
    let stepDuration = 60 // Default 1 hour per step
    if (targetDate && totalEstimatedMinutes > 0) {
      const availableMinutes = Math.max(
        (new Date(targetDate).getTime() - new Date(currentDate).getTime()) / (1000 * 60),
        totalEstimatedMinutes
      )
      stepDuration = availableMinutes / templateSteps.length
    }

    for (const stepData of templateSteps) {
      const plannedStart = new Date(currentDate)
      const plannedEnd = new Date(new Date(currentDate).getTime() + (stepData.estimatedMinutes || stepDuration) * 60 * 1000)
      
      const step = await tx.routingStep.create({
        data: {
          order_id: order_id,
          workspace_id: 'default',
          name: stepData.name,
          workcenter: stepData.workcenter,
          sequence: stepData.sequence,
          dependsOn: JSON.stringify(stepData.dependsOn || []),
          joinType: stepData.joinType,
          standard_spec: stepData.standard_spec || {},
          expectedInputs: stepData.expectedInputs || {},
          expectedOutputs: stepData.expectedOutputs || {},
          canRunParallel: stepData.canRunParallel || false,
          plannedStart,
          plannedEnd,
          status: stepData.sequence === 1 ? 'READY' : 'PLANNED' // First step starts ready
        }
      })

      steps.push(step)
      currentDate = plannedEnd
    }

    return steps
  }

  /**
   * Initialize default routing templates
   */
  static async initializeTemplates(): Promise<void> {
    const templates = [
      {
        templateKey: 'SILK_OPTION_A',
        name: 'Silkscreen Standard (Cut → Print → Sew)',
        method: PrintMethod.SILKSCREEN,
        steps: [
          {
            name: 'Cutting',
            workcenter: 'CUTTING',
            sequence: 10,
            dependsOn: [],
            estimatedMinutes: 120,
            expectedOutputs: { bundles: true, qrCodes: true }
          },
          {
            name: 'Screen Preparation',
            workcenter: 'PRINTING',
            sequence: 20,
            dependsOn: [],
            canRunParallel: true,
            estimatedMinutes: 60,
            expectedOutputs: { screens: true }
          },
          {
            name: 'Printing',
            workcenter: 'PRINTING',
            sequence: 30,
            dependsOn: ['Cutting', 'Screen Preparation'],
            joinType: 'AND',
            estimatedMinutes: 90,
            standard_spec: { tempC: 160, curetime: 90 }
          },
          {
            name: 'Sewing',
            workcenter: 'SEWING',
            sequence: 40,
            dependsOn: ['Printing'],
            estimatedMinutes: 180
          },
          {
            name: 'QC',
            workcenter: 'QC',
            sequence: 50,
            dependsOn: ['Sewing'],
            estimatedMinutes: 30
          },
          {
            name: 'Packing',
            workcenter: 'PACKING',
            sequence: 60,
            dependsOn: ['QC'],
            estimatedMinutes: 45
          }
        ]
      },
      {
        templateKey: 'SILK_OPTION_B',
        name: 'Silkscreen Alternative (Cut → Sew → Print) [Ashley Guarded]',
        method: PrintMethod.SILKSCREEN,
        steps: [
          {
            name: 'Cutting',
            workcenter: 'CUTTING',
            sequence: 10,
            dependsOn: [],
            estimatedMinutes: 120
          },
          {
            name: 'Sewing',
            workcenter: 'SEWING',
            sequence: 20,
            dependsOn: ['Cutting'],
            estimatedMinutes: 180
          },
          {
            name: 'Screen Preparation',
            workcenter: 'PRINTING',
            sequence: 25,
            dependsOn: [],
            canRunParallel: true,
            estimatedMinutes: 60
          },
          {
            name: 'Printing on Garment',
            workcenter: 'PRINTING',
            sequence: 30,
            dependsOn: ['Sewing', 'Screen Preparation'],
            joinType: 'AND',
            estimatedMinutes: 120,
            standard_spec: { tempC: 160, curetime: 90 }
          },
          {
            name: 'QC',
            workcenter: 'QC',
            sequence: 40,
            dependsOn: ['Printing on Garment'],
            estimatedMinutes: 30
          },
          {
            name: 'Packing',
            workcenter: 'PACKING',
            sequence: 50,
            dependsOn: ['QC'],
            estimatedMinutes: 45
          }
        ]
      },
      {
        templateKey: 'SUBL_DEFAULT',
        name: 'Sublimation Standard (GA → Print → Heat Press → Cut → Sew)',
        method: PrintMethod.SUBLIMATION,
        steps: [
          {
            name: 'Graphic Arts',
            workcenter: 'DESIGN',
            sequence: 10,
            dependsOn: [],
            estimatedMinutes: 90
          },
          {
            name: 'Print Transfer Paper',
            workcenter: 'PRINTING',
            sequence: 20,
            dependsOn: ['Graphic Arts'],
            estimatedMinutes: 60
          },
          {
            name: 'Heat Press Transfer',
            workcenter: 'HEAT_PRESS',
            sequence: 30,
            dependsOn: ['Print Transfer Paper'],
            estimatedMinutes: 120,
            standard_spec: { tempC: 200, seconds: 60, pressure: 'medium' }
          },
          {
            name: 'Cutting',
            workcenter: 'CUTTING',
            sequence: 40,
            dependsOn: ['Heat Press Transfer'],
            estimatedMinutes: 90
          },
          {
            name: 'Sewing',
            workcenter: 'SEWING',
            sequence: 50,
            dependsOn: ['Cutting'],
            estimatedMinutes: 180
          },
          {
            name: 'QC',
            workcenter: 'QC',
            sequence: 60,
            dependsOn: ['Sewing'],
            estimatedMinutes: 30
          },
          {
            name: 'Packing',
            workcenter: 'PACKING',
            sequence: 70,
            dependsOn: ['QC'],
            estimatedMinutes: 45
          }
        ]
      },
      {
        templateKey: 'DTF_DEFAULT',
        name: 'DTF Standard (Receive → DTF → Heat Press → QC)',
        method: PrintMethod.DTF,
        steps: [
          {
            name: 'Receive Plain Garments',
            workcenter: 'WAREHOUSE',
            sequence: 10,
            dependsOn: [],
            estimatedMinutes: 30
          },
          {
            name: 'Print DTF Film',
            workcenter: 'PRINTING',
            sequence: 20,
            dependsOn: [],
            canRunParallel: true,
            estimatedMinutes: 60
          },
          {
            name: 'Powder & Cure DTF',
            workcenter: 'PRINTING',
            sequence: 30,
            dependsOn: ['Print DTF Film'],
            estimatedMinutes: 45,
            standard_spec: { tempC: 160, seconds: 120 }
          },
          {
            name: 'Heat Press to Garment',
            workcenter: 'HEAT_PRESS',
            sequence: 40,
            dependsOn: ['Receive Plain Garments', 'Powder & Cure DTF'],
            joinType: 'AND',
            estimatedMinutes: 90,
            standard_spec: { tempC: 160, seconds: 15, pressure: 'firm' }
          },
          {
            name: 'QC',
            workcenter: 'QC',
            sequence: 50,
            dependsOn: ['Heat Press to Garment'],
            estimatedMinutes: 30
          },
          {
            name: 'Packing',
            workcenter: 'PACKING',
            sequence: 60,
            dependsOn: ['QC'],
            estimatedMinutes: 30
          }
        ]
      },
      {
        templateKey: 'EMB_DEFAULT',
        name: 'Embroidery Standard (Cut → Emb → Sew → QC)',
        method: PrintMethod.EMBROIDERY,
        steps: [
          {
            name: 'Cutting',
            workcenter: 'CUTTING',
            sequence: 10,
            dependsOn: [],
            estimatedMinutes: 120
          },
          {
            name: 'Embroidery',
            workcenter: 'EMB',
            sequence: 20,
            dependsOn: ['Cutting'],
            estimatedMinutes: 150,
            standard_spec: { density: 'medium', stabilizer: 'cutaway' }
          },
          {
            name: 'Sewing',
            workcenter: 'SEWING',
            sequence: 30,
            dependsOn: ['Embroidery'],
            estimatedMinutes: 180
          },
          {
            name: 'QC',
            workcenter: 'QC',
            sequence: 40,
            dependsOn: ['Sewing'],
            estimatedMinutes: 30
          },
          {
            name: 'Packing',
            workcenter: 'PACKING',
            sequence: 50,
            dependsOn: ['QC'],
            estimatedMinutes: 45
          }
        ]
      }
    ]

    for (const templateData of templates) {
      await prisma.routeTemplate.upsert({
        where: { id: templateData.templateKey },
        update: {
          name: templateData.name
        },
        create: {
          workspace_id: 'default',
          name: templateData.name,
          category: templateData.method,
          is_active: true
        }
      })
    }

    console.log('ASH AI routing templates initialized')
  }

  /**
   * Get available templates for a method
   */
  static async getTemplatesForMethod(method: PrintMethod): Promise<any[]> {
    return await prisma.routeTemplate.findMany({
      where: {
        category: method,
        is_active: true
      },
      orderBy: [
        { name: 'asc' }
      ]
    })
  }

  /**
   * Get template by key
   */
  static async getTemplate(templateKey: string): Promise<any> {
    return await prisma.routeTemplate.findUnique({
      where: { id: templateKey }
    })
  }
}