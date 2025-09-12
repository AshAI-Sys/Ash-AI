// @ts-nocheck
/**
 * ASH AI ERP - Intelligent Task Auto-Assignment Engine
 * Automated task creation, assignment, and workload balancing
 */

// @ts-nocheck
import { db } from './db'
import { OrderStatus, Role, TaskStatus, WorkcenterType } from '@prisma/client'
import { NotificationAutomation } from './notification-automation'

export interface TaskTemplate {
  id: string
  name: string
  description: string
  type: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  estimatedHours: number
  requiredRole: Role
  requiredSkills?: string[]
  triggerStatus: OrderStatus
  triggerConditions?: Record<string, any>
  dependencies?: string[]
  autoAssign: boolean
  instructions?: string
}

export interface OperatorWorkload {
  userId: string
  userName: string
  role: Role
  currentTasks: number
  totalHours: number
  efficiency: number
  skills: string[]
  availability: 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE'
  lastAssigned?: Date
}

export interface TaskAssignmentRule {
  id: string
  name: string
  workspaceId: string
  role: Role
  assignmentStrategy: 'ROUND_ROBIN' | 'LEAST_LOADED' | 'SKILL_BASED' | 'EFFICIENCY_BASED'
  considerations: {
    workload: boolean
    skills: boolean
    efficiency: boolean
    availability: boolean
  }
  enabled: boolean
}

export class TaskAutoAssignment {
  private static instance: TaskAutoAssignment
  private taskTemplates: Map<string, TaskTemplate> = new Map()
  private assignmentRules: Map<Role, TaskAssignmentRule> = new Map()

  static getInstance(): TaskAutoAssignment {
    if (!TaskAutoAssignment.instance) {
      TaskAutoAssignment.instance = new TaskAutoAssignment()
    }
    return TaskAutoAssignment.instance
  }

  // Initialize task automation
  async initialize() {
    console.log('🎯 Initializing Task Auto-Assignment Engine...')
    
    await this.loadTaskTemplates()
    await this.loadAssignmentRules()
    
    console.log('✅ Task automation initialized')
  }

  // Load task templates from database
  private async loadTaskTemplates() {
    try {
      const templates = await db.taskTemplate.findMany({
        where: { enabled: true }
      })

      this.taskTemplates.clear()
      templates.forEach(template => {
        this.taskTemplates.set(template.id, {
          id: template.id,
          name: template.name,
          description: template.description,
          type: template.type,
          priority: template.priority as any,
          estimatedHours: template.estimated_hours,
          requiredRole: template.required_role as Role,
          requiredSkills: JSON.parse(template.required_skills as string || '[]'),
          triggerStatus: template.trigger_status as OrderStatus,
          triggerConditions: JSON.parse(template.trigger_conditions as string || '{}'),
          dependencies: JSON.parse(template.dependencies as string || '[]'),
          autoAssign: template.auto_assign,
          instructions: template.instructions
        })
      })
    } catch (error) {
      console.error('Failed to load task templates:', error)
      await this.createDefaultTaskTemplates()
    }
  }

  // Load assignment rules
  private async loadAssignmentRules() {
    try {
      const rules = await db.taskAssignmentRule.findMany({
        where: { enabled: true }
      })

      this.assignmentRules.clear()
      rules.forEach(rule => {
        this.assignmentRules.set(rule.role as Role, {
          id: rule.id,
          name: rule.name,
          workspaceId: rule.workspace_id,
          role: rule.role as Role,
          assignmentStrategy: rule.assignment_strategy as any,
          considerations: JSON.parse(rule.considerations as string),
          enabled: rule.enabled
        })
      })
    } catch (error) {
      console.error('Failed to load assignment rules:', error)
      await this.createDefaultAssignmentRules()
    }
  }

  // Create default task templates
  private async createDefaultTaskTemplates() {
    const defaultTemplates = [
      // Design Phase Tasks
      {
        name: 'Create Initial Design Mockup',
        description: 'Create initial design mockup based on client requirements',
        type: 'DESIGN',
        priority: 'HIGH',
        estimatedHours: 2,
        requiredRole: 'GRAPHIC_ARTIST',
        triggerStatus: 'DESIGN_PENDING',
        autoAssign: true,
        instructions: 'Review client brief and create initial design mockup following brand guidelines'
      },
      {
        name: 'Prepare Color Separations',
        description: 'Prepare color separations for silkscreen printing',
        type: 'DESIGN',
        priority: 'HIGH',
        estimatedHours: 1,
        requiredRole: 'GRAPHIC_ARTIST',
        triggerStatus: 'DESIGN_PENDING',
        autoAssign: true,
        requiredSkills: ['color_separation', 'silkscreen'],
        dependencies: ['Create Initial Design Mockup']
      },
      // Production Tasks
      {
        name: 'Setup Cutting Layout',
        description: 'Create optimized cutting layout for fabric efficiency',
        type: 'CUTTING',
        priority: 'MEDIUM',
        estimatedHours: 0.5,
        requiredRole: 'OPERATOR',
        triggerStatus: 'PRODUCTION_PLANNED',
        autoAssign: true,
        requiredSkills: ['cutting', 'layout_optimization']
      },
      {
        name: 'Execute Fabric Cutting',
        description: 'Cut fabric pieces according to layout plan',
        type: 'CUTTING',
        priority: 'HIGH',
        estimatedHours: 2,
        requiredRole: 'OPERATOR',
        triggerStatus: 'PRODUCTION_PLANNED',
        autoAssign: true,
        dependencies: ['Setup Cutting Layout']
      },
      {
        name: 'Screen Preparation',
        description: 'Prepare screens for silkscreen printing',
        type: 'PRINTING',
        priority: 'HIGH',
        estimatedHours: 1,
        requiredRole: 'SCREEN_MAKING',
        triggerStatus: 'IN_PROGRESS',
        autoAssign: true,
        requiredSkills: ['screen_making', 'emulsion']
      },
      {
        name: 'Silkscreen Printing',
        description: 'Execute silkscreen printing on garments',
        type: 'PRINTING',
        priority: 'HIGH',
        estimatedHours: 3,
        requiredRole: 'SILKSCREEN_OPERATOR',
        triggerStatus: 'IN_PROGRESS',
        autoAssign: true,
        dependencies: ['Screen Preparation', 'Execute Fabric Cutting']
      },
      // Quality Control Tasks
      {
        name: 'Pre-Production Quality Check',
        description: 'Inspect materials and setup before production',
        type: 'QC',
        priority: 'HIGH',
        estimatedHours: 0.5,
        requiredRole: 'QC_INSPECTOR',
        triggerStatus: 'IN_PROGRESS',
        autoAssign: true
      },
      {
        name: 'Final Quality Inspection',
        description: 'Conduct final quality inspection on completed products',
        type: 'QC',
        priority: 'CRITICAL',
        estimatedHours: 1,
        requiredRole: 'QC_INSPECTOR',
        triggerStatus: 'QC',
        autoAssign: true,
        instructions: 'Check for print quality, stitching, measurements, and overall finish'
      },
      // Finishing Tasks
      {
        name: 'Product Finishing',
        description: 'Complete product finishing and packaging preparation',
        type: 'FINISHING',
        priority: 'MEDIUM',
        estimatedHours: 1,
        requiredRole: 'FINISHING_STAFF',
        triggerStatus: 'PACKING',
        autoAssign: true
      },
      {
        name: 'Package for Delivery',
        description: 'Package products according to delivery requirements',
        type: 'PACKING',
        priority: 'HIGH',
        estimatedHours: 0.5,
        requiredRole: 'WAREHOUSE_STAFF',
        triggerStatus: 'PACKING',
        autoAssign: true,
        dependencies: ['Product Finishing']
      }
    ]

    for (const template of defaultTemplates) {
      try {
        await db.taskTemplate.create({
          data: {
            name: template.name,
            description: template.description,
            type: template.type,
            priority: template.priority,
            estimated_hours: template.estimatedHours,
            required_role: template.requiredRole,
            required_skills: JSON.stringify(template.requiredSkills || []),
            trigger_status: template.triggerStatus,
            trigger_conditions: JSON.stringify({}),
            dependencies: JSON.stringify(template.dependencies || []),
            auto_assign: template.autoAssign,
            instructions: template.instructions,
            enabled: true
          }
        })
      } catch (error) {
        console.warn(`Failed to create task template ${template.name}:`, error)
      }
    }

    await this.loadTaskTemplates()
  }

  // Create default assignment rules
  private async createDefaultAssignmentRules() {
    const defaultRules = [
      {
        name: 'Graphic Artist Assignment',
        role: 'GRAPHIC_ARTIST',
        assignmentStrategy: 'SKILL_BASED',
        considerations: {
          workload: true,
          skills: true,
          efficiency: true,
          availability: true
        }
      },
      {
        name: 'Operator Assignment',
        role: 'OPERATOR',
        assignmentStrategy: 'LEAST_LOADED',
        considerations: {
          workload: true,
          skills: false,
          efficiency: true,
          availability: true
        }
      },
      {
        name: 'QC Inspector Assignment',
        role: 'QC_INSPECTOR',
        assignmentStrategy: 'ROUND_ROBIN',
        considerations: {
          workload: true,
          skills: false,
          efficiency: true,
          availability: true
        }
      },
      {
        name: 'Silkscreen Operator Assignment',
        role: 'SILKSCREEN_OPERATOR',
        assignmentStrategy: 'EFFICIENCY_BASED',
        considerations: {
          workload: true,
          skills: true,
          efficiency: true,
          availability: true
        }
      }
    ]

    // Get a workspace ID for the rules
    const workspace = await db.workspace.findFirst()
    if (!workspace) return

    for (const rule of defaultRules) {
      try {
        await db.taskAssignmentRule.create({
          data: {
            name: rule.name,
            workspace_id: workspace.id,
            role: rule.role,
            assignment_strategy: rule.assignmentStrategy,
            considerations: JSON.stringify(rule.considerations),
            enabled: true
          }
        })
      } catch (error) {
        console.warn(`Failed to create assignment rule ${rule.name}:`, error)
      }
    }

    await this.loadAssignmentRules()
  }

  // Create tasks for a specific order status
  async createTasksForStatus(orderId: string, status: OrderStatus) {
    try {
      const order = await db.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          routing_steps: true
        }
      })

      if (!order) return

      // Find templates for this status
      const relevantTemplates = Array.from(this.taskTemplates.values()).filter(
        template => template.triggerStatus === status
      )

      for (const template of relevantTemplates) {
        // Check if task already exists
        const existingTask = await db.task.findFirst({
          where: {
            workspace_id: order.workspace_id,
            title: template.name,
            metadata: {
              path: ['orderId'],
              equals: orderId
            }
          }
        })

        if (existingTask) continue

        // Check dependencies
        if (template.dependencies && template.dependencies.length > 0) {
          const dependenciesMet = await this.checkTaskDependencies(
            orderId,
            template.dependencies
          )
          if (!dependenciesMet) continue
        }

        // Create the task
        const task = await this.createTask(order, template)

        // Auto-assign if enabled
        if (template.autoAssign && task) {
          await this.autoAssignTask(task.id, template.requiredRole, template.requiredSkills)
        }
      }
    } catch (error) {
      console.error(`Failed to create tasks for order ${orderId}:`, error)
    }
  }

  // Create a task from template
  private async createTask(order: any, template: TaskTemplate) {
    try {
      const dueDate = new Date()
      dueDate.setHours(dueDate.getHours() + template.estimatedHours + 8) // Add buffer

      const task = await db.task.create({
        data: {
          workspace_id: order.workspace_id,
          title: template.name,
          description: template.description,
          type: template.type,
          priority: template.priority,
          due_date: dueDate,
          metadata: JSON.stringify({
            orderId: order.id,
            templateId: template.id,
            estimatedHours: template.estimatedHours,
            instructions: template.instructions,
            requiredSkills: template.requiredSkills
          }),
          created_by: 'SYSTEM'
        }
      })

      console.log(`✅ Created task: ${template.name} for order ${order.po_number}`)
      return task
    } catch (error) {
      console.error(`Failed to create task ${template.name}:`, error)
      return null
    }
  }

  // Auto-assign task to best available operator
  private async autoAssignTask(taskId: string, role: Role, requiredSkills?: string[]) {
    try {
      // Get assignment rule for this role
      const rule = this.assignmentRules.get(role)
      if (!rule) {
        console.warn(`No assignment rule found for role ${role}`)
        return
      }

      // Get available operators
      const operators = await this.getAvailableOperators(rule.workspaceId, role)
      if (operators.length === 0) {
        console.warn(`No available operators found for role ${role}`)
        return
      }

      // Select best operator based on strategy
      const selectedOperator = await this.selectOperator(operators, rule, requiredSkills)
      if (!selectedOperator) {
        console.warn(`No suitable operator found for task ${taskId}`)
        return
      }

      // Assign the task
      await db.task.update({
        where: { id: taskId },
        data: {
          assigned_to: selectedOperator.userId,
          status: 'PENDING'
        }
      })

      // Send notification to assigned operator
      await NotificationAutomation.getInstance().scheduleNotification({
        templateId: 'task-assignment', // Will use a template or create inline
        recipientId: selectedOperator.userId,
        channels: ['IN_APP', 'EMAIL'],
        variables: {
          taskTitle: (await db.task.findUnique({ where: { id: taskId } }))?.title || 'New Task',
          priority: (await db.task.findUnique({ where: { id: taskId } }))?.priority || 'MEDIUM'
        },
        priority: 'NORMAL'
      })

      console.log(`✅ Assigned task ${taskId} to ${selectedOperator.userName}`)
    } catch (error) {
      console.error(`Failed to auto-assign task ${taskId}:`, error)
    }
  }

  // Get available operators for a role
  private async getAvailableOperators(workspaceId: string, role: Role): Promise<OperatorWorkload[]> {
    const users = await db.user.findMany({
      where: {
        workspace_id: workspaceId,
        role: role,
        active: true
      }
    })

    const operators: OperatorWorkload[] = []

    for (const user of users) {
      // Calculate current workload
      const currentTasks = await db.task.count({
        where: {
          assigned_to: user.id,
          status: { in: ['PENDING', 'IN_PROGRESS'] }
        }
      })

      const totalHours = await this.calculateTotalHours(user.id)
      const efficiency = await this.calculateEfficiency(user.id)
      const skills = await this.getUserSkills(user.id)
      const availability = await this.checkAvailability(user.id)

      operators.push({
        userId: user.id,
        userName: user.full_name,
        role: user.role as Role,
        currentTasks,
        totalHours,
        efficiency,
        skills,
        availability,
        lastAssigned: await this.getLastAssignedDate(user.id)
      })
    }

    return operators.filter(op => op.availability === 'AVAILABLE')
  }

  // Select best operator based on assignment strategy
  private async selectOperator(
    operators: OperatorWorkload[],
    rule: TaskAssignmentRule,
    requiredSkills?: string[]
  ): Promise<OperatorWorkload | null> {
    if (operators.length === 0) return null

    // Filter by skills if required
    let candidates = operators
    if (requiredSkills && requiredSkills.length > 0 && rule.considerations.skills) {
      candidates = operators.filter(op => 
        requiredSkills.every(skill => op.skills.includes(skill))
      )
      if (candidates.length === 0) {
        // Fallback to all operators if no perfect skill match
        candidates = operators
      }
    }

    switch (rule.assignmentStrategy) {
      case 'ROUND_ROBIN':
        return this.selectRoundRobin(candidates)

      case 'LEAST_LOADED':
        return this.selectLeastLoaded(candidates)

      case 'EFFICIENCY_BASED':
        return this.selectByEfficiency(candidates)

      case 'SKILL_BASED':
        return this.selectBySkills(candidates, requiredSkills || [])

      default:
        return candidates[0]
    }
  }

  // Selection strategies
  private selectRoundRobin(operators: OperatorWorkload[]): OperatorWorkload {
    // Select operator who was assigned longest ago
    return operators.reduce((oldest, current) => {
      if (!oldest.lastAssigned) return current
      if (!current.lastAssigned) return oldest
      return current.lastAssigned < oldest.lastAssigned ? current : oldest
    })
  }

  private selectLeastLoaded(operators: OperatorWorkload[]): OperatorWorkload {
    return operators.reduce((least, current) => 
      current.totalHours < least.totalHours ? current : least
    )
  }

  private selectByEfficiency(operators: OperatorWorkload[]): OperatorWorkload {
    return operators.reduce((best, current) => 
      current.efficiency > best.efficiency ? current : best
    )
  }

  private selectBySkills(operators: OperatorWorkload[], requiredSkills: string[]): OperatorWorkload {
    // Score operators by skill match
    const scored = operators.map(op => ({
      operator: op,
      score: requiredSkills.filter(skill => op.skills.includes(skill)).length
    }))

    const best = scored.reduce((best, current) => 
      current.score > best.score ? current : best
    )

    return best.operator
  }

  // Helper methods
  private async calculateTotalHours(userId: string): Promise<number> {
    const tasks = await db.task.findMany({
      where: {
        assigned_to: userId,
        status: { in: ['PENDING', 'IN_PROGRESS'] }
      }
    })

    return tasks.reduce((total, task) => {
      const metadata = task.metadata ? JSON.parse(task.metadata as string) : {}
      return total + (metadata.estimatedHours || 2)
    }, 0)
  }

  private async calculateEfficiency(userId: string): Promise<number> {
    // Calculate based on completed tasks vs estimated time
    const completedTasks = await db.task.findMany({
      where: {
        assigned_to: userId,
        status: 'COMPLETED',
        completed_at: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    })

    if (completedTasks.length === 0) return 85 // Default efficiency

    // This is a simplified calculation - in real implementation,
    // you'd compare actual vs estimated completion times
    return Math.min(100, 70 + completedTasks.length * 2)
  }

  private async getUserSkills(userId: string): Promise<string[]> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { profile: true }
    })

    const profile = user?.profile ? JSON.parse(user.profile as string) : {}
    return profile.skills || []
  }

  private async checkAvailability(userId: string): Promise<'AVAILABLE' | 'BUSY' | 'UNAVAILABLE'> {
    const currentTasks = await db.task.count({
      where: {
        assigned_to: userId,
        status: { in: ['PENDING', 'IN_PROGRESS'] }
      }
    })

    // Simple availability logic
    if (currentTasks >= 5) return 'BUSY'
    if (currentTasks >= 8) return 'UNAVAILABLE'
    return 'AVAILABLE'
  }

  private async getLastAssignedDate(userId: string): Promise<Date | undefined> {
    const lastTask = await db.task.findFirst({
      where: { assigned_to: userId },
      orderBy: { created_at: 'desc' },
      select: { created_at: true }
    })

    return lastTask?.created_at
  }

  private async checkTaskDependencies(orderId: string, dependencies: string[]): Promise<boolean> {
    for (const dependency of dependencies) {
      const dependentTask = await db.task.findFirst({
        where: {
          title: dependency,
          metadata: {
            path: ['orderId'],
            equals: orderId
          },
          status: 'COMPLETED'
        }
      })

      if (!dependentTask) return false
    }

    return true
  }

  // Process auto-assignments for pending tasks
  async processAutoAssignments() {
    const unassignedTasks = await db.task.findMany({
      where: {
        assigned_to: null,
        status: 'OPEN'
      },
      take: 20 // Process 20 at a time
    })

    for (const task of unassignedTasks) {
      const metadata = task.metadata ? JSON.parse(task.metadata as string) : {}
      const templateId = metadata.templateId
      
      if (templateId) {
        const template = this.taskTemplates.get(templateId)
        if (template && template.autoAssign) {
          await this.autoAssignTask(task.id, template.requiredRole, template.requiredSkills)
        }
      }
    }
  }

  // Public methods for management
  async createTaskTemplate(template: Omit<TaskTemplate, 'id'>) {
    const newTemplate = await db.taskTemplate.create({
      data: {
        name: template.name,
        description: template.description,
        type: template.type,
        priority: template.priority,
        estimated_hours: template.estimatedHours,
        required_role: template.requiredRole,
        required_skills: JSON.stringify(template.requiredSkills || []),
        trigger_status: template.triggerStatus,
        trigger_conditions: JSON.stringify(template.triggerConditions || {}),
        dependencies: JSON.stringify(template.dependencies || []),
        auto_assign: template.autoAssign,
        instructions: template.instructions,
        enabled: true
      }
    })

    await this.loadTaskTemplates()
    return newTemplate
  }

  async updateAssignmentRule(role: Role, rule: Partial<TaskAssignmentRule>) {
    const existing = await db.taskAssignmentRule.findFirst({
      where: { role: role }
    })

    if (existing) {
      await db.taskAssignmentRule.update({
        where: { id: existing.id },
        data: {
          assignment_strategy: rule.assignmentStrategy,
          considerations: rule.considerations ? JSON.stringify(rule.considerations) : undefined,
          enabled: rule.enabled
        }
      })
    }

    await this.loadAssignmentRules()
  }

  async getWorkloadReport(workspaceId: string) {
    const roles = ['GRAPHIC_ARTIST', 'OPERATOR', 'QC_INSPECTOR', 'SILKSCREEN_OPERATOR']
    const report: Record<string, OperatorWorkload[]> = {}

    for (const role of roles) {
      report[role] = await this.getAvailableOperators(workspaceId, role as Role)
    }

    return report
  }
}

// Export singleton instance
export const taskAutoAssignment = TaskAutoAssignment.getInstance()

// Initialize on import (server-side only)
if (typeof window === 'undefined') {
  taskAutoAssignment.initialize().catch(console.error)
}