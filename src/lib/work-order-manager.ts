// 🎖️ WORK ORDER MANAGEMENT SYSTEM
// Commander Protocol: Automated work order creation and management
// Neural ERP - Production Work Order Intelligence

import { prisma } from './prisma';
import { workflowEngine } from './workflow-engine';
import { productionTracker } from './production-tracker';
import { Prisma } from '@prisma/client';

// Work Order Types
export type WorkOrderType =
  | 'PRODUCTION'
  | 'MAINTENANCE'
  | 'QUALITY_CHECK'
  | 'SETUP'
  | 'CLEANUP'
  | 'MATERIAL_PREP'
  | 'PACKAGING';

export type WorkOrderStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ON_HOLD'
  | 'BLOCKED';

export type WorkOrderPriority =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'URGENT'
  | 'CRITICAL';

// Work Order Interface
export interface WorkOrder {
  id: string;
  work_order_number: string;
  type: WorkOrderType;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  title: string;
  description: string;
  order_id?: string;
  production_stage?: string;
  machine_id?: string;
  assigned_to?: string;
  created_by: string;
  estimated_duration_hours: number;
  actual_duration_hours?: number;
  scheduled_start: Date;
  scheduled_end: Date;
  actual_start?: Date;
  actual_end?: Date;
  materials_required?: string[];
  tools_required?: string[];
  skills_required?: string[];
  instructions: string;
  quality_requirements?: string;
  safety_notes?: string;
  completion_notes?: string;
  completion_photos?: string[];
  dependencies?: string[]; // Other work order IDs that must complete first
  progress_percentage: number;
  workspace_id: string;
  created_at: Date;
  updated_at: Date;
}

// Work Order Template
export interface WorkOrderTemplate {
  id: string;
  name: string;
  type: WorkOrderType;
  category: string;
  description: string;
  estimated_duration_hours: number;
  materials_required: string[];
  tools_required: string[];
  skills_required: string[];
  instructions: string;
  quality_requirements?: string;
  safety_notes?: string;
  is_active: boolean;
  workspace_id: string;
}

class WorkOrderManager {
  private static instance: WorkOrderManager;

  static getInstance(): WorkOrderManager {
    if (!WorkOrderManager.instance) {
      WorkOrderManager.instance = new WorkOrderManager();
    }
    return WorkOrderManager.instance;
  }

  // Create Work Order
  async createWorkOrder(data: {
    type: WorkOrderType;
    priority: WorkOrderPriority;
    title: string;
    description: string;
    order_id?: string;
    production_stage?: string;
    machine_id?: string;
    estimated_duration_hours: number;
    scheduled_start: Date;
    materials_required?: string[];
    tools_required?: string[];
    skills_required?: string[];
    instructions: string;
    quality_requirements?: string;
    safety_notes?: string;
    dependencies?: string[];
    created_by: string;
    workspace_id: string;
  }): Promise<WorkOrder> {
    const workOrderNumber = await this.generateWorkOrderNumber(data.type);

    const scheduledEnd = new Date(data.scheduled_start);
    scheduledEnd.setHours(scheduledEnd.getHours() + data.estimated_duration_hours);

    const workOrder = await prisma.workOrder.create({
      data: {
        work_order_number: workOrderNumber,
        type: data.type,
        status: 'PENDING',
        priority: data.priority,
        title: data.title,
        description: data.description,
        order_id: data.order_id,
        production_stage: data.production_stage,
        machine_id: data.machine_id,
        created_by: data.created_by,
        estimated_duration_hours: data.estimated_duration_hours,
        scheduled_start: data.scheduled_start,
        scheduled_end: scheduledEnd,
        materials_required: data.materials_required || [],
        tools_required: data.tools_required || [],
        skills_required: data.skills_required || [],
        instructions: data.instructions,
        quality_requirements: data.quality_requirements,
        safety_notes: data.safety_notes,
        dependencies: data.dependencies || [],
        progress_percentage: 0,
        workspace_id: data.workspace_id
      }
    });

    // Auto-assign if possible
    await this.autoAssignWorkOrder(workOrder.id);

    // Log creation
    console.log(`🎖️ [WORK ORDER] Created ${workOrder.work_order_number}: ${workOrder.title}`);

    return workOrder as WorkOrder;
  }

  // Create Work Order from Template
  async createFromTemplate(templateId: string, data: {
    order_id?: string;
    production_stage?: string;
    machine_id?: string;
    scheduled_start: Date;
    priority?: WorkOrderPriority;
    created_by: string;
    workspace_id: string;
    customizations?: {
      title?: string;
      description?: string;
      instructions?: string;
      estimated_duration_hours?: number;
    };
  }): Promise<WorkOrder> {
    const template = await prisma.workOrderTemplate.findUnique({
      where: { id: templateId }
    });

    if (!template) {
      throw new Error('Work order template not found');
    }

    return this.createWorkOrder({
      type: template.type as WorkOrderType,
      priority: data.priority || 'MEDIUM',
      title: data.customizations?.title || template.name,
      description: data.customizations?.description || template.description,
      order_id: data.order_id,
      production_stage: data.production_stage,
      machine_id: data.machine_id,
      estimated_duration_hours: data.customizations?.estimated_duration_hours || template.estimated_duration_hours,
      scheduled_start: data.scheduled_start,
      materials_required: template.materials_required,
      tools_required: template.tools_required,
      skills_required: template.skills_required,
      instructions: data.customizations?.instructions || template.instructions,
      quality_requirements: template.quality_requirements || undefined,
      safety_notes: template.safety_notes || undefined,
      created_by: data.created_by,
      workspace_id: data.workspace_id
    });
  }

  // Auto-assign Work Order
  async autoAssignWorkOrder(workOrderId: string): Promise<boolean> {
    try {
      const workOrder = await prisma.workOrder.findUnique({
        where: { id: workOrderId }
      });

      if (!workOrder) return false;

      // Find available operators with required skills
      const availableOperators = await this.findAvailableOperators(
        workOrder.skills_required,
        workOrder.scheduled_start,
        workOrder.scheduled_end,
        workOrder.workspace_id
      );

      if (availableOperators.length === 0) {
        console.log(`🎖️ [WORK ORDER] No available operators for ${workOrder.work_order_number}`);
        return false;
      }

      // Select best operator (highest skill match + lowest current workload)
      const bestOperator = await this.selectBestOperator(availableOperators, workOrder);

      if (bestOperator) {
        await prisma.workOrder.update({
          where: { id: workOrderId },
          data: {
            assigned_to: bestOperator.id,
            status: 'ASSIGNED'
          }
        });

        console.log(`🎖️ [WORK ORDER] Auto-assigned ${workOrder.work_order_number} to ${bestOperator.name}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('🚨 [WORK ORDER] Auto-assignment error:', error);
      return false;
    }
  }

  // Start Work Order
  async startWorkOrder(workOrderId: string, operatorId: string): Promise<WorkOrder> {
    const workOrder = await prisma.workOrder.update({
      where: { id: workOrderId },
      data: {
        status: 'IN_PROGRESS',
        actual_start: new Date(),
        assigned_to: operatorId
      }
    });

    // Start production tracking if related to production
    if (workOrder.order_id && workOrder.production_stage) {
      await productionTracker.startProductionStage({
        order_id: workOrder.order_id,
        stage: workOrder.production_stage as any,
        operator_id: operatorId,
        machine_id: workOrder.machine_id || undefined,
        pieces_total: 100, // Default, should be calculated from order
        metadata: {
          work_order_id: workOrderId,
          work_order_number: workOrder.work_order_number
        }
      });
    }

    console.log(`🎖️ [WORK ORDER] Started ${workOrder.work_order_number}`);
    return workOrder as WorkOrder;
  }

  // Update Work Order Progress
  async updateProgress(workOrderId: string, data: {
    progress_percentage?: number;
    notes?: string;
    materials_used?: string[];
    quality_checks?: any[];
    photos?: string[];
    issues_encountered?: string;
  }): Promise<WorkOrder> {
    const updateData: any = {
      updated_at: new Date()
    };

    if (data.progress_percentage !== undefined) {
      updateData.progress_percentage = Math.min(100, Math.max(0, data.progress_percentage));
    }

    const workOrder = await prisma.workOrder.update({
      where: { id: workOrderId },
      data: updateData
    });

    // Create progress entry
    await prisma.workOrderProgress.create({
      data: {
        work_order_id: workOrderId,
        progress_percentage: data.progress_percentage || workOrder.progress_percentage,
        notes: data.notes,
        materials_used: data.materials_used || [],
        quality_checks: data.quality_checks || [],
        photos: data.photos || [],
        issues_encountered: data.issues_encountered,
        recorded_at: new Date(),
        workspace_id: workOrder.workspace_id
      }
    });

    return workOrder as WorkOrder;
  }

  // Complete Work Order
  async completeWorkOrder(workOrderId: string, data: {
    completion_notes: string;
    completion_photos?: string[];
    quality_rating?: number;
    materials_used?: string[];
    actual_duration_override?: number;
  }): Promise<WorkOrder> {
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId }
    });

    if (!workOrder) {
      throw new Error('Work order not found');
    }

    const actualEnd = new Date();
    const actualDuration = workOrder.actual_start
      ? (actualEnd.getTime() - workOrder.actual_start.getTime()) / (1000 * 60 * 60) // hours
      : data.actual_duration_override || workOrder.estimated_duration_hours;

    const updatedWorkOrder = await prisma.workOrder.update({
      where: { id: workOrderId },
      data: {
        status: 'COMPLETED',
        actual_end: actualEnd,
        actual_duration_hours: actualDuration,
        progress_percentage: 100,
        completion_notes: data.completion_notes,
        completion_photos: data.completion_photos || [],
        updated_at: new Date()
      }
    });

    // Complete related production tracking
    if (workOrder.order_id && workOrder.production_stage) {
      // Find and complete the production event
      // This would need to be implemented with proper event tracking
    }

    // Check if this completion unblocks other work orders
    await this.checkDependentWorkOrders(workOrderId);

    console.log(`🎖️ [WORK ORDER] Completed ${workOrder.work_order_number}`);
    return updatedWorkOrder as WorkOrder;
  }

  // Auto-generate Work Orders for Production Orders
  async generateProductionWorkOrders(orderId: string, createdBy: string): Promise<WorkOrder[]> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { productionStages: true }
    });

    if (!order) {
      throw new Error('Order not found');
    }

    const workOrders: WorkOrder[] = [];
    const stages = ['CUTTING', 'PRINTING', 'SEWING', 'QUALITY_CONTROL', 'FINISHING', 'PACKING'];

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const scheduledStart = new Date(order.requested_deadline || Date.now());
      scheduledStart.setDate(scheduledStart.getDate() - (stages.length - i) * 2); // 2 days per stage

      const workOrder = await this.createWorkOrder({
        type: 'PRODUCTION',
        priority: this.determinePriorityFromOrder(order),
        title: `${stage} - Order ${order.po_number}`,
        description: `${stage} production stage for order ${order.po_number}`,
        order_id: orderId,
        production_stage: stage,
        estimated_duration_hours: this.getStageEstimatedHours(stage, order.quantity || 1),
        scheduled_start: scheduledStart,
        instructions: this.getStageInstructions(stage),
        quality_requirements: this.getStageQualityRequirements(stage),
        safety_notes: this.getStageSafetyNotes(stage),
        dependencies: i > 0 ? [workOrders[i - 1].id] : [],
        created_by: createdBy,
        workspace_id: order.workspace_id
      });

      workOrders.push(workOrder);
    }

    console.log(`🎖️ [WORK ORDER] Generated ${workOrders.length} work orders for Order ${order.po_number}`);
    return workOrders;
  }

  // Get Work Order Dashboard Data
  async getDashboardData(workspaceId: string, filters?: {
    status?: WorkOrderStatus[];
    type?: WorkOrderType[];
    assigned_to?: string;
    priority?: WorkOrderPriority[];
    date_from?: Date;
    date_to?: Date;
  }) {
    const whereClause: any = { workspace_id: workspaceId };

    if (filters?.status) whereClause.status = { in: filters.status };
    if (filters?.type) whereClause.type = { in: filters.type };
    if (filters?.assigned_to) whereClause.assigned_to = filters.assigned_to;
    if (filters?.priority) whereClause.priority = { in: filters.priority };
    if (filters?.date_from || filters?.date_to) {
      whereClause.scheduled_start = {};
      if (filters.date_from) whereClause.scheduled_start.gte = filters.date_from;
      if (filters.date_to) whereClause.scheduled_start.lte = filters.date_to;
    }

    const [workOrders, summary] = await Promise.all([
      prisma.workOrder.findMany({
        where: whereClause,
        include: {
          assignedTo: { select: { name: true } },
          order: { select: { po_number: true, client: { select: { name: true } } } },
          machine: { select: { name: true, code: true } }
        },
        orderBy: [
          { priority: 'desc' },
          { scheduled_start: 'asc' }
        ]
      }),
      this.getWorkOrderSummary(workspaceId)
    ]);

    return {
      work_orders: workOrders,
      summary,
      timestamp: new Date()
    };
  }

  // Helper Methods
  private async generateWorkOrderNumber(type: WorkOrderType): Promise<string> {
    const prefix = type.substring(0, 3).toUpperCase();
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');

    const count = await prisma.workOrder.count({
      where: {
        work_order_number: {
          startsWith: `WO-${prefix}-${year}${month}`
        }
      }
    });

    return `WO-${prefix}-${year}${month}-${(count + 1).toString().padStart(4, '0')}`;
  }

  private async findAvailableOperators(skillsRequired: string[], startTime: Date, endTime: Date, workspaceId: string) {
    return prisma.user.findMany({
      where: {
        workspace_id: workspaceId,
        role: { in: ['OPERATOR', 'PRODUCTION_MANAGER'] },
        is_active: true,
        skills: {
          hasSome: skillsRequired
        },
        assignedWorkOrders: {
          none: {
            status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
            OR: [
              { scheduled_start: { lte: endTime }, scheduled_end: { gte: startTime } }
            ]
          }
        }
      }
    });
  }

  private async selectBestOperator(operators: any[], workOrder: any) {
    // Score operators based on skill match and current workload
    const scoredOperators = await Promise.all(
      operators.map(async (operator) => {
        const skillMatch = this.calculateSkillMatch(operator.skills, workOrder.skills_required);
        const currentWorkload = await this.getCurrentWorkload(operator.id);
        const efficiency = operator.performance_rating || 100;

        const score = (skillMatch * 0.4) + ((100 - currentWorkload) * 0.3) + (efficiency * 0.3);

        return { operator, score };
      })
    );

    scoredOperators.sort((a, b) => b.score - a.score);
    return scoredOperators[0]?.operator || null;
  }

  private calculateSkillMatch(operatorSkills: string[], requiredSkills: string[]): number {
    if (requiredSkills.length === 0) return 100;

    const matches = requiredSkills.filter(skill => operatorSkills.includes(skill)).length;
    return (matches / requiredSkills.length) * 100;
  }

  private async getCurrentWorkload(operatorId: string): Promise<number> {
    const activeWorkOrders = await prisma.workOrder.count({
      where: {
        assigned_to: operatorId,
        status: { in: ['ASSIGNED', 'IN_PROGRESS'] }
      }
    });

    return Math.min(100, activeWorkOrders * 25); // 25% per active work order
  }

  private async checkDependentWorkOrders(completedWorkOrderId: string) {
    const dependentWorkOrders = await prisma.workOrder.findMany({
      where: {
        dependencies: { has: completedWorkOrderId },
        status: 'PENDING'
      }
    });

    for (const workOrder of dependentWorkOrders) {
      // Check if all dependencies are completed
      const allDependencies = await prisma.workOrder.findMany({
        where: { id: { in: workOrder.dependencies } }
      });

      const allCompleted = allDependencies.every(dep => dep.status === 'COMPLETED');

      if (allCompleted) {
        await this.autoAssignWorkOrder(workOrder.id);
      }
    }
  }

  private determinePriorityFromOrder(order: any): WorkOrderPriority {
    const daysUntilDue = order.requested_deadline
      ? Math.ceil((new Date(order.requested_deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 30;

    if (daysUntilDue <= 2) return 'CRITICAL';
    if (daysUntilDue <= 5) return 'URGENT';
    if (daysUntilDue <= 10) return 'HIGH';
    return 'MEDIUM';
  }

  private getStageEstimatedHours(stage: string, quantity: number): number {
    const baseHours = {
      CUTTING: 2,
      PRINTING: 4,
      SEWING: 8,
      QUALITY_CONTROL: 1,
      FINISHING: 3,
      PACKING: 1
    };

    return (baseHours[stage] || 4) * Math.max(1, Math.ceil(quantity / 100));
  }

  private getStageInstructions(stage: string): string {
    const instructions = {
      CUTTING: 'Cut fabric according to pattern specifications. Verify measurements before cutting.',
      PRINTING: 'Apply designs using specified printing method. Check color accuracy and placement.',
      SEWING: 'Sew pieces according to construction specifications. Maintain quality standards.',
      QUALITY_CONTROL: 'Inspect finished garments for defects and compliance with specifications.',
      FINISHING: 'Complete final assembly, trimming, and preparation for packaging.',
      PACKING: 'Package items according to shipping requirements. Verify quantities and labeling.'
    };

    return instructions[stage] || 'Complete assigned production tasks according to specifications.';
  }

  private getStageQualityRequirements(stage: string): string {
    const requirements = {
      CUTTING: 'All cuts must be within 2mm tolerance. No fabric waste exceeding 5%.',
      PRINTING: 'Color match must be within Delta E 2.0. No print defects or misalignment.',
      SEWING: 'All seams straight with 1/4" seam allowance. No loose threads or puckering.',
      QUALITY_CONTROL: 'AQL 2.5 inspection standard. Document all defects found.',
      FINISHING: 'All loose threads removed. Press according to garment care instructions.',
      PACKING: 'Correct quantities, proper folding, clean packaging materials.'
    };

    return requirements[stage] || 'Maintain standard quality requirements.';
  }

  private getStageSafetyNotes(stage: string): string {
    const safety = {
      CUTTING: 'Use proper cutting tools safely. Keep blades sharp and clean.',
      PRINTING: 'Ensure proper ventilation. Wear protective equipment when handling chemicals.',
      SEWING: 'Keep fingers away from needle. Maintain proper posture.',
      QUALITY_CONTROL: 'Follow inspection procedures. Report safety hazards immediately.',
      FINISHING: 'Use pressing equipment safely. Check temperature settings.',
      PACKING: 'Use proper lifting techniques. Keep work area clear of hazards.'
    };

    return safety[stage] || 'Follow standard safety procedures.';
  }

  private async getWorkOrderSummary(workspaceId: string) {
    const [statusCounts, priorityCounts, typeCounts] = await Promise.all([
      prisma.workOrder.groupBy({
        by: ['status'],
        where: { workspace_id: workspaceId },
        _count: { id: true }
      }),
      prisma.workOrder.groupBy({
        by: ['priority'],
        where: { workspace_id: workspaceId },
        _count: { id: true }
      }),
      prisma.workOrder.groupBy({
        by: ['type'],
        where: { workspace_id: workspaceId },
        _count: { id: true }
      })
    ]);

    return {
      by_status: statusCounts.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {}),
      by_priority: priorityCounts.reduce((acc, item) => {
        acc[item.priority] = item._count.id;
        return acc;
      }, {}),
      by_type: typeCounts.reduce((acc, item) => {
        acc[item.type] = item._count.id;
        return acc;
      }, {})
    };
  }
}

// Export singleton instance
export const workOrderManager = WorkOrderManager.getInstance();

console.log('🎖️ [WORK ORDER MANAGER] Work order management system initialized');