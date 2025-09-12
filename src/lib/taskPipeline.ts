// @ts-nocheck
import { PrintMethod, Role } from '@prisma/client'

export interface TaskStep {
  taskType: string
  assignedRole: Role
  description: string
  estimatedHours: number
  dependencies?: string[] // Task types this depends on
  canOutsource?: boolean // Can this task be outsourced to subcontractors
  requiresMaterials?: string[] // What materials/inventory items are needed
  qualityCheckpoints?: string[] // What to check at this step
}

export interface Pipeline {
  printMethod: PrintMethod
  steps: TaskStep[]
}

// Define task pipelines for each print method
export const TASK_PIPELINES: Record<PrintMethod, Pipeline> = {
  SILKSCREEN: {
    printMethod: PrintMethod.SILKSCREEN,
    steps: [
      {
        taskType: 'DESIGN_PREP',
        assignedRole: Role.GRAPHIC_ARTIST,
        description: 'Create design files and color separation',
        estimatedHours: 2,
        canOutsource: false,
        requiresMaterials: [],
        qualityCheckpoints: ['Design approval', 'Color accuracy', 'File format validation']
      },
      {
        taskType: 'FRAME_SETUP',
        assignedRole: Role.SILKSCREEN_OPERATOR,
        description: 'Prepare screens, mesh, and frames',
        estimatedHours: 1,
        dependencies: ['DESIGN_PREP'],
        canOutsource: true,
        requiresMaterials: ['Screen mesh', 'Frames', 'Squeegees', 'Emulsion'],
        qualityCheckpoints: ['Screen tension', 'Mesh quality', 'Frame alignment']
      },
      {
        taskType: 'SILKSCREEN_PRINTING',
        assignedRole: Role.SILKSCREEN_OPERATOR,
        description: 'Screen printing with inks and antimigration',
        estimatedHours: 3,
        dependencies: ['FRAME_SETUP'],
        canOutsource: true,
        requiresMaterials: ['Screen printing ink', 'Antimigration base', 'Apparel blanks', 'Cleaning solvents'],
        qualityCheckpoints: ['Print registration', 'Color matching', 'Ink coverage', 'No bleeding']
      },
      {
        taskType: 'SEWING',
        assignedRole: Role.SEWING_OPERATOR,
        description: 'Sew apparel components',
        estimatedHours: 4,
        dependencies: ['SILKSCREEN_PRINTING'],
        canOutsource: true,
        requiresMaterials: ['Thread', 'Labels', 'Notions', 'Needles'],
        qualityCheckpoints: ['Seam strength', 'Stitch quality', 'Measurements', 'Label placement']
      },
      {
        taskType: 'QUALITY_CONTROL',
        assignedRole: Role.QC_INSPECTOR,
        description: 'Quality inspection and approval',
        estimatedHours: 1,
        dependencies: ['SEWING'],
        canOutsource: false,
        requiresMaterials: ['Measuring tools', 'Light box'],
        qualityCheckpoints: ['Overall appearance', 'Size accuracy', 'Print quality', 'Construction defects']
      },
      {
        taskType: 'FINISHING',
        assignedRole: Role.FINISHING_STAFF,
        description: 'Final finishing and packaging',
        estimatedHours: 1,
        dependencies: ['QUALITY_CONTROL'],
        canOutsource: false,
        requiresMaterials: ['Packaging materials', 'Tags', 'Poly bags', 'Shipping labels'],
        qualityCheckpoints: ['Packaging quality', 'Correct labeling', 'Complete count']
      }
    ]
  },

  SUBLIMATION: {
    printMethod: PrintMethod.SUBLIMATION,
    steps: [
      {
        taskType: 'DESIGN_PREP',
        assignedRole: Role.GRAPHIC_ARTIST,
        description: 'Prepare sublimation design files',
        estimatedHours: 1.5
      },
      {
        taskType: 'SUBLIMATION_PRINTING',
        assignedRole: Role.SUBLIMATION_OPERATOR,
        description: 'Print on sublimation paper with special inks',
        estimatedHours: 2,
        dependencies: ['DESIGN_PREP']
      },
      {
        taskType: 'HEAT_TRANSFER',
        assignedRole: Role.SUBLIMATION_OPERATOR,
        description: 'Heat press transfer to apparel',
        estimatedHours: 2,
        dependencies: ['SUBLIMATION_PRINTING']
      },
      {
        taskType: 'SEWING',
        assignedRole: Role.SEWING_OPERATOR,
        description: 'Sew apparel components',
        estimatedHours: 4,
        dependencies: ['HEAT_TRANSFER']
      },
      {
        taskType: 'QUALITY_CONTROL',
        assignedRole: Role.QC_INSPECTOR,
        description: 'Quality inspection and approval',
        estimatedHours: 1,
        dependencies: ['SEWING']
      },
      {
        taskType: 'FINISHING',
        assignedRole: Role.FINISHING_STAFF,
        description: 'Final finishing and packaging',
        estimatedHours: 1,
        dependencies: ['QUALITY_CONTROL']
      }
    ]
  },

  DTF: {
    printMethod: PrintMethod.DTF,
    steps: [
      {
        taskType: 'DESIGN_PREP',
        assignedRole: Role.GRAPHIC_ARTIST,
        description: 'Prepare DTF design files',
        estimatedHours: 1.5
      },
      {
        taskType: 'DTF_PRINTING',
        assignedRole: Role.DTF_OPERATOR,
        description: 'Print on DTF film with special inks',
        estimatedHours: 2,
        dependencies: ['DESIGN_PREP']
      },
      {
        taskType: 'DTF_TRANSFER',
        assignedRole: Role.DTF_OPERATOR,
        description: 'Heat press DTF film to apparel',
        estimatedHours: 2,
        dependencies: ['DTF_PRINTING']
      },
      {
        taskType: 'SEWING',
        assignedRole: Role.SEWING_OPERATOR,
        description: 'Sew apparel components',
        estimatedHours: 4,
        dependencies: ['DTF_TRANSFER']
      },
      {
        taskType: 'QUALITY_CONTROL',
        assignedRole: Role.QC_INSPECTOR,
        description: 'Quality inspection and approval',
        estimatedHours: 1,
        dependencies: ['SEWING']
      },
      {
        taskType: 'FINISHING',
        assignedRole: Role.FINISHING_STAFF,
        description: 'Final finishing and packaging',
        estimatedHours: 1,
        dependencies: ['QUALITY_CONTROL']
      }
    ]
  },

  EMBROIDERY: {
    printMethod: PrintMethod.EMBROIDERY,
    steps: [
      {
        taskType: 'DESIGN_PREP',
        assignedRole: Role.GRAPHIC_ARTIST,
        description: 'Create embroidery design and DST files',
        estimatedHours: 3
      },
      {
        taskType: 'EMBROIDERY_SETUP',
        assignedRole: Role.EMBROIDERY_OPERATOR,
        description: 'Set up embroidery machine and threads',
        estimatedHours: 1,
        dependencies: ['DESIGN_PREP']
      },
      {
        taskType: 'EMBROIDERY_WORK',
        assignedRole: Role.EMBROIDERY_OPERATOR,
        description: 'Embroider design on apparel',
        estimatedHours: 4,
        dependencies: ['EMBROIDERY_SETUP']
      },
      {
        taskType: 'SEWING',
        assignedRole: Role.SEWING_OPERATOR,
        description: 'Sew apparel components',
        estimatedHours: 4,
        dependencies: ['EMBROIDERY_WORK']
      },
      {
        taskType: 'QUALITY_CONTROL',
        assignedRole: Role.QC_INSPECTOR,
        description: 'Quality inspection and approval',
        estimatedHours: 1,
        dependencies: ['SEWING']
      },
      {
        taskType: 'FINISHING',
        assignedRole: Role.FINISHING_STAFF,
        description: 'Final finishing and packaging',
        estimatedHours: 1,
        dependencies: ['QUALITY_CONTROL']
      }
    ]
  },

  NONE: {
    printMethod: PrintMethod.NONE,
    steps: [
      {
        taskType: 'SEWING',
        assignedRole: Role.SEWING_OPERATOR,
        description: 'Sew plain apparel (no printing)',
        estimatedHours: 4
      },
      {
        taskType: 'QUALITY_CONTROL',
        assignedRole: Role.QC_INSPECTOR,
        description: 'Quality inspection and approval',
        estimatedHours: 1,
        dependencies: ['SEWING']
      },
      {
        taskType: 'FINISHING',
        assignedRole: Role.FINISHING_STAFF,
        description: 'Final finishing and packaging',
        estimatedHours: 1,
        dependencies: ['QUALITY_CONTROL']
      }
    ]
  }
}

export class TaskPipelineService {
  /**
   * Get the pipeline for a specific print method
   */
  static getPipeline(printMethod: PrintMethod): Pipeline {
    return TASK_PIPELINES[printMethod]
  }

  /**
   * Generate tasks for an order based on its print method
   */
  static generateTasksForOrder(order_id: string, printMethod: PrintMethod, dueDate?: Date) {
    const pipeline = this.getPipeline(printMethod)
    const tasks = []

    for (let i = 0; i < pipeline.steps.length; i++) {
      const step = pipeline.steps[i]
      
      // Calculate due date for this task (working backwards from order due date)
      let taskDueDate: Date | undefined
      if (dueDate) {
        const totalHoursFromEnd = pipeline.steps
          .slice(i)
          .reduce((sum, s) => sum + s.estimatedHours, 0)
        
        taskDueDate = new Date(new Date(dueDate).getTime() - (totalHoursFromEnd * 60 * 60 * 1000))
      }

      const task = {
        order_id,
        taskType: step.taskType,
        description: step.description,
        assignedRole: step.assignedRole,
        estimatedHours: step.estimatedHours,
        dueDate: taskDueDate,
        priority: pipeline.steps.length - i, // Earlier tasks have higher priority
        dependencies: step.dependencies || [],
        status: i === 0 ? 'OPEN' : 'BLOCKED', // First task is pending, rest are blocked
        canOutsource: step.canOutsource || false,
        requiresMaterials: step.requiresMaterials || [],
        qualityCheckpoints: step.qualityCheckpoints || []
      }

      tasks.push(task)
    }

    return tasks
  }

  /**
   * Check if a task can be started (all dependencies completed)
   */
  static canStartTask(taskType: string, completedTaskTypes: string[], printMethod: PrintMethod): boolean {
    const pipeline = this.getPipeline(printMethod)
    const step = pipeline.steps.find(s => s.taskType === taskType)
    
    if (!step || !step.dependencies) return true

    return step.dependencies.every(dep => completedTaskTypes.includes(dep))
  }

  /**
   * Get next available tasks when a task is completed
   */
  static getNextAvailableTasks(completedTaskType: string, printMethod: PrintMethod): string[] {
    const pipeline = this.getPipeline(printMethod)
    const nextTasks = []

    for (const step of pipeline.steps) {
      if (step.dependencies?.includes(completedTaskType)) {
        nextTasks.push(step.taskType)
      }
    }

    return nextTasks
  }

  /**
   * Get estimated completion time for an order
   */
  static getEstimatedCompletionTime(printMethod: PrintMethod, startDate = new Date()): Date {
    const pipeline = this.getPipeline(printMethod)
    const totalHours = pipeline.steps.reduce((sum, step) => sum + step.estimatedHours, 0)
    
    // Assuming 8 working hours per day
    const totalDays = Math.ceil(totalHours / 8)
    const completionDate = new Date(startDate)
    completionDate.setDate(completionDate.getDate() + totalDays)
    
    return completionDate
  }

  /**
   * Get all unique roles involved in a print method
   */
  static getRolesForPrintMethod(printMethod: PrintMethod): Role[] {
    const pipeline = this.getPipeline(printMethod)
    const roles = [...new Set(pipeline.steps.map(step => step.assignedRole))]
    return roles
  }

  /**
   * Get tasks that can be outsourced for capacity management
   */
  static getOutsourceableTasks(printMethod: PrintMethod): string[] {
    const pipeline = this.getPipeline(printMethod)
    return pipeline.steps
      .filter(step => step.canOutsource)
      .map(step => step.taskType)
  }

  /**
   * Get required materials for a specific task
   */
  static getRequiredMaterials(taskType: string, printMethod: PrintMethod): string[] {
    const pipeline = this.getPipeline(printMethod)
    const step = pipeline.steps.find(s => s.taskType === taskType)
    return step?.requiresMaterials || []
  }

  /**
   * Get quality checkpoints for a specific task
   */
  static getQualityCheckpoints(taskType: string, printMethod: PrintMethod): string[] {
    const pipeline = this.getPipeline(printMethod)
    const step = pipeline.steps.find(s => s.taskType === taskType)
    return step?.qualityCheckpoints || []
  }

  /**
   * Calculate workload distribution across roles
   */
  static getWorkloadByRole(printMethod: PrintMethod): Record<string, number> {
    const pipeline = this.getPipeline(printMethod)
    const workload: Record<string, number> = {}
    
    pipeline.steps.forEach(step => {
      const role = step.assignedRole
      workload[role] = (workload[role] || 0) + step.estimatedHours
    })
    
    return workload
  }
}