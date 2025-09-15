// 🎖️ AUTOMATION COORDINATOR
// Commander Protocol: Master orchestrator for all automated workflows
// Neural ERP - Complete Automation Intelligence System

import { workflowEngine } from './workflow-engine';
import { approvalEngine } from './approval-engine';
import { productionTracker } from './production-tracker';
import { workOrderManager } from './work-order-manager';
import { prisma } from './prisma';

// Event Types for Cross-System Coordination
export type AutomationEvent =
  | 'ORDER_CREATED'
  | 'ORDER_APPROVED'
  | 'ORDER_REJECTED'
  | 'PRODUCTION_STARTED'
  | 'PRODUCTION_STAGE_COMPLETED'
  | 'PRODUCTION_COMPLETED'
  | 'QUALITY_CHECK_PASSED'
  | 'QUALITY_CHECK_FAILED'
  | 'WORK_ORDER_COMPLETED'
  | 'MACHINE_ALERT'
  | 'INVENTORY_LOW'
  | 'DELIVERY_SCHEDULED'
  | 'PAYMENT_RECEIVED';

// Automation Trigger Configuration
export interface AutomationTrigger {
  id: string;
  event: AutomationEvent;
  conditions: Record<string, any>;
  actions: AutomationAction[];
  is_active: boolean;
  priority: number;
  description: string;
}

export interface AutomationAction {
  type: 'WORKFLOW_TRIGGER' | 'APPROVAL_PROCESS' | 'WORK_ORDER_CREATE' | 'NOTIFICATION' | 'EMAIL' | 'API_CALL';
  config: Record<string, any>;
  delay_minutes?: number;
  retry_count?: number;
}

class AutomationCoordinator {
  private static instance: AutomationCoordinator;
  private triggers: Map<AutomationEvent, AutomationTrigger[]> = new Map();
  private isInitialized = false;

  static getInstance(): AutomationCoordinator {
    if (!AutomationCoordinator.instance) {
      AutomationCoordinator.instance = new AutomationCoordinator();
    }
    return AutomationCoordinator.instance;
  }

  // Initialize automation system
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🎖️ [AUTOMATION] Initializing automation coordinator...');

    // Setup default automation triggers
    await this.setupDefaultTriggers();

    // Load custom triggers from database
    await this.loadCustomTriggers();

    // Setup event listeners
    this.setupEventListeners();

    this.isInitialized = true;
    console.log('🎖️ [AUTOMATION] Automation coordinator initialized successfully');
  }

  // Process automation event
  async processEvent(event: AutomationEvent, data: Record<string, any>): Promise<void> {
    try {
      console.log(`🎖️ [AUTOMATION] Processing event: ${event}`, data);

      const triggers = this.triggers.get(event) || [];
      const activeTriggers = triggers.filter(t => t.is_active);

      if (activeTriggers.length === 0) {
        console.log(`🎖️ [AUTOMATION] No active triggers found for event: ${event}`);
        return;
      }

      // Sort by priority (higher first)
      activeTriggers.sort((a, b) => b.priority - a.priority);

      // Process each trigger
      for (const trigger of activeTriggers) {
        if (await this.evaluateConditions(trigger.conditions, data)) {
          await this.executeTrigger(trigger, data);
        }
      }
    } catch (error) {
      console.error('🚨 [AUTOMATION] Event processing error:', error);
    }
  }

  // Execute automation trigger
  private async executeTrigger(trigger: AutomationTrigger, eventData: Record<string, any>): Promise<void> {
    console.log(`🎖️ [AUTOMATION] Executing trigger: ${trigger.description}`);

    for (const action of trigger.actions) {
      try {
        // Apply delay if specified
        if (action.delay_minutes && action.delay_minutes > 0) {
          console.log(`🎖️ [AUTOMATION] Delaying action for ${action.delay_minutes} minutes`);
          // In production, this would use a job queue
          await new Promise(resolve => setTimeout(resolve, action.delay_minutes * 60 * 1000));
        }

        await this.executeAction(action, eventData);
      } catch (error) {
        console.error(`🚨 [AUTOMATION] Action execution failed:`, error);

        // Retry logic
        if (action.retry_count && action.retry_count > 0) {
          for (let retry = 1; retry <= action.retry_count; retry++) {
            try {
              console.log(`🎖️ [AUTOMATION] Retrying action (attempt ${retry}/${action.retry_count})`);
              await new Promise(resolve => setTimeout(resolve, retry * 5000)); // Exponential backoff
              await this.executeAction(action, eventData);
              break;
            } catch (retryError) {
              if (retry === action.retry_count) {
                console.error(`🚨 [AUTOMATION] Action failed after ${action.retry_count} retries:`, retryError);
              }
            }
          }
        }
      }
    }
  }

  // Execute individual automation action
  private async executeAction(action: AutomationAction, eventData: Record<string, any>): Promise<void> {
    switch (action.type) {
      case 'WORKFLOW_TRIGGER':
        await this.executeWorkflowTrigger(action.config, eventData);
        break;

      case 'APPROVAL_PROCESS':
        await this.executeApprovalProcess(action.config, eventData);
        break;

      case 'WORK_ORDER_CREATE':
        await this.executeWorkOrderCreation(action.config, eventData);
        break;

      case 'NOTIFICATION':
        await this.executeNotification(action.config, eventData);
        break;

      case 'EMAIL':
        await this.executeEmail(action.config, eventData);
        break;

      case 'API_CALL':
        await this.executeApiCall(action.config, eventData);
        break;

      default:
        console.warn(`🚨 [AUTOMATION] Unknown action type: ${action.type}`);
    }
  }

  // Action Executors
  private async executeWorkflowTrigger(config: any, eventData: any): Promise<void> {
    const workflowId = this.replacePlaceholders(config.workflow_id, eventData);
    const context = { ...eventData, ...config.context };

    console.log(`🎖️ [AUTOMATION] Triggering workflow: ${workflowId}`);
    await workflowEngine.triggerWorkflow(workflowId, context);
  }

  private async executeApprovalProcess(config: any, eventData: any): Promise<void> {
    const processType = config.process_type;
    const entityId = this.replacePlaceholders(config.entity_id, eventData);

    console.log(`🎖️ [AUTOMATION] Starting approval process: ${processType} for ${entityId}`);
    await approvalEngine.processApproval(processType, entityId, eventData);
  }

  private async executeWorkOrderCreation(config: any, eventData: any): Promise<void> {
    const workOrderData = {
      type: config.type,
      priority: config.priority || 'MEDIUM',
      title: this.replacePlaceholders(config.title, eventData),
      description: this.replacePlaceholders(config.description, eventData),
      order_id: eventData.order_id,
      production_stage: config.production_stage,
      machine_id: config.machine_id,
      estimated_duration_hours: config.estimated_duration_hours || 4,
      scheduled_start: config.scheduled_start ? new Date(config.scheduled_start) : new Date(),
      instructions: this.replacePlaceholders(config.instructions, eventData),
      created_by: eventData.created_by || 'system',
      workspace_id: eventData.workspace_id || 'default'
    };

    console.log(`🎖️ [AUTOMATION] Creating work order: ${workOrderData.title}`);
    await workOrderManager.createWorkOrder(workOrderData);
  }

  private async executeNotification(config: any, eventData: any): Promise<void> {
    const notification = {
      recipient_id: this.replacePlaceholders(config.recipient_id, eventData),
      title: this.replacePlaceholders(config.title, eventData),
      message: this.replacePlaceholders(config.message, eventData),
      type: config.type || 'INFO',
      workspace_id: eventData.workspace_id || 'default'
    };

    console.log(`🎖️ [AUTOMATION] Creating notification: ${notification.title}`);
    await prisma.notification.create({
      data: {
        recipient_id: notification.recipient_id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        workspace_id: notification.workspace_id,
        is_read: false
      }
    });
  }

  private async executeEmail(config: any, eventData: any): Promise<void> {
    const emailData = {
      to: this.replacePlaceholders(config.to, eventData),
      subject: this.replacePlaceholders(config.subject, eventData),
      body: this.replacePlaceholders(config.body, eventData),
      template: config.template
    };

    console.log(`🎖️ [AUTOMATION] Sending email to: ${emailData.to}`);
    // In production, integrate with email service
    console.log('📧 [EMAIL]', emailData);
  }

  private async executeApiCall(config: any, eventData: any): Promise<void> {
    const url = this.replacePlaceholders(config.url, eventData);
    const method = config.method || 'POST';
    const headers = config.headers || { 'Content-Type': 'application/json' };
    const body = config.body ? JSON.stringify(this.replacePlaceholders(config.body, eventData)) : undefined;

    console.log(`🎖️ [AUTOMATION] Making API call: ${method} ${url}`);

    try {
      const response = await fetch(url, { method, headers, body });
      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }
      console.log(`🎖️ [AUTOMATION] API call successful: ${response.status}`);
    } catch (error) {
      console.error('🚨 [AUTOMATION] API call failed:', error);
      throw error;
    }
  }

  // Condition evaluation
  private async evaluateConditions(conditions: Record<string, any>, eventData: Record<string, any>): Promise<boolean> {
    for (const [key, expectedValue] of Object.entries(conditions)) {
      const actualValue = this.getNestedValue(eventData, key);

      if (!this.compareValues(actualValue, expectedValue)) {
        return false;
      }
    }
    return true;
  }

  private compareValues(actual: any, expected: any): boolean {
    if (typeof expected === 'object' && expected !== null) {
      // Support for operators like { "$gt": 100 }, { "$in": ["value1", "value2"] }
      if (expected.$gt !== undefined) return actual > expected.$gt;
      if (expected.$gte !== undefined) return actual >= expected.$gte;
      if (expected.$lt !== undefined) return actual < expected.$lt;
      if (expected.$lte !== undefined) return actual <= expected.$lte;
      if (expected.$in !== undefined) return expected.$in.includes(actual);
      if (expected.$not !== undefined) return actual !== expected.$not;
    }

    return actual === expected;
  }

  // Utility methods
  private replacePlaceholders(template: string, data: Record<string, any>): string {
    if (typeof template !== 'string') return template;

    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const value = this.getNestedValue(data, key.trim());
      return value !== undefined ? String(value) : match;
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // Setup default automation triggers
  private async setupDefaultTriggers(): Promise<void> {
    const defaultTriggers: AutomationTrigger[] = [
      {
        id: 'auto-approve-small-orders',
        event: 'ORDER_CREATED',
        conditions: {
          'total_amount': { '$lt': 10000 },
          'client.credit_rating': { '$gte': 'GOOD' }
        },
        actions: [
          {
            type: 'APPROVAL_PROCESS',
            config: {
              process_type: 'ORDER_APPROVAL',
              entity_id: '{{order_id}}',
              auto_approve: true
            }
          }
        ],
        is_active: true,
        priority: 100,
        description: 'Auto-approve small orders from good credit clients'
      },
      {
        id: 'create-production-work-orders',
        event: 'ORDER_APPROVED',
        conditions: {},
        actions: [
          {
            type: 'WORK_ORDER_CREATE',
            config: {
              action: 'generate_production',
              order_id: '{{order_id}}'
            }
          }
        ],
        is_active: true,
        priority: 90,
        description: 'Create production work orders when order is approved'
      },
      {
        id: 'advance-production-stage',
        event: 'PRODUCTION_STAGE_COMPLETED',
        conditions: {},
        actions: [
          {
            type: 'WORKFLOW_TRIGGER',
            config: {
              workflow_id: 'advance_production_stage',
              context: {
                order_id: '{{order_id}}',
                completed_stage: '{{stage}}',
                quality_score: '{{quality_score}}'
              }
            }
          }
        ],
        is_active: true,
        priority: 80,
        description: 'Advance to next production stage when current stage is completed'
      },
      {
        id: 'quality-check-failure-alert',
        event: 'QUALITY_CHECK_FAILED',
        conditions: {},
        actions: [
          {
            type: 'NOTIFICATION',
            config: {
              recipient_id: 'quality_manager',
              title: 'Quality Check Failed - Order {{order_id}}',
              message: 'Quality check failed for order {{order_id}} at {{stage}} stage. Immediate attention required.',
              type: 'URGENT'
            }
          },
          {
            type: 'WORK_ORDER_CREATE',
            config: {
              type: 'QUALITY_CHECK',
              priority: 'URGENT',
              title: 'Investigate Quality Issue - Order {{order_id}}',
              description: 'Investigate and resolve quality issues found in {{stage}} stage',
              instructions: 'Review failed quality check results and implement corrective actions'
            }
          }
        ],
        is_active: true,
        priority: 95,
        description: 'Alert and create work order when quality check fails'
      },
      {
        id: 'machine-maintenance-alert',
        event: 'MACHINE_ALERT',
        conditions: {
          'alert_type': 'MAINTENANCE_DUE'
        },
        actions: [
          {
            type: 'WORK_ORDER_CREATE',
            config: {
              type: 'MAINTENANCE',
              priority: 'HIGH',
              title: 'Scheduled Maintenance - {{machine_id}}',
              description: 'Perform scheduled maintenance on machine {{machine_id}}',
              machine_id: '{{machine_id}}',
              estimated_duration_hours: 4,
              instructions: 'Follow standard maintenance procedures for {{machine_type}}'
            }
          }
        ],
        is_active: true,
        priority: 85,
        description: 'Create maintenance work order when machine maintenance is due'
      },
      {
        id: 'inventory-reorder-alert',
        event: 'INVENTORY_LOW',
        conditions: {
          'stock_level': { '$lt': 'reorder_point' }
        },
        actions: [
          {
            type: 'NOTIFICATION',
            config: {
              recipient_id: 'inventory_manager',
              title: 'Low Inventory Alert - {{item_name}}',
              message: 'Inventory for {{item_name}} is below reorder point. Current stock: {{stock_level}}, Reorder point: {{reorder_point}}',
              type: 'WARNING'
            }
          },
          {
            type: 'API_CALL',
            config: {
              url: '/api/inventory/auto-reorder',
              method: 'POST',
              body: {
                item_id: '{{item_id}}',
                current_stock: '{{stock_level}}',
                reorder_quantity: '{{reorder_quantity}}'
              }
            }
          }
        ],
        is_active: true,
        priority: 70,
        description: 'Alert and trigger reorder when inventory is low'
      }
    ];

    // Register all default triggers
    for (const trigger of defaultTriggers) {
      this.registerTrigger(trigger);
    }

    console.log(`🎖️ [AUTOMATION] Registered ${defaultTriggers.length} default triggers`);
  }

  // Load custom triggers from database
  private async loadCustomTriggers(): Promise<void> {
    try {
      const customTriggers = await prisma.automationTrigger.findMany({
        where: { is_active: true }
      });

      for (const trigger of customTriggers) {
        this.registerTrigger({
          id: trigger.id,
          event: trigger.event as AutomationEvent,
          conditions: trigger.conditions as Record<string, any>,
          actions: trigger.actions as AutomationAction[],
          is_active: trigger.is_active,
          priority: trigger.priority,
          description: trigger.description
        });
      }

      console.log(`🎖️ [AUTOMATION] Loaded ${customTriggers.length} custom triggers`);
    } catch (error) {
      console.error('🚨 [AUTOMATION] Failed to load custom triggers:', error);
    }
  }

  // Register automation trigger
  private registerTrigger(trigger: AutomationTrigger): void {
    if (!this.triggers.has(trigger.event)) {
      this.triggers.set(trigger.event, []);
    }
    this.triggers.get(trigger.event)!.push(trigger);
  }

  // Setup event listeners for cross-system integration
  private setupEventListeners(): void {
    // Production tracker events
    productionTracker.addEventListener('production_started', (data) => {
      this.processEvent('PRODUCTION_STARTED', data);
    });

    productionTracker.addEventListener('production_completed', (data) => {
      this.processEvent('PRODUCTION_STAGE_COMPLETED', data);
    });

    // Workflow engine events
    workflowEngine.addEventListener('workflow_completed', (data) => {
      if (data.workflow_type === 'ORDER_APPROVAL') {
        this.processEvent(data.result === 'APPROVED' ? 'ORDER_APPROVED' : 'ORDER_REJECTED', data);
      }
    });

    console.log('🎖️ [AUTOMATION] Event listeners configured');
  }

  // Public methods for external triggering
  async triggerOrderCreated(orderData: any): Promise<void> {
    await this.processEvent('ORDER_CREATED', orderData);
  }

  async triggerQualityCheckResult(orderData: any, passed: boolean): Promise<void> {
    await this.processEvent(passed ? 'QUALITY_CHECK_PASSED' : 'QUALITY_CHECK_FAILED', orderData);
  }

  async triggerMachineAlert(machineData: any): Promise<void> {
    await this.processEvent('MACHINE_ALERT', machineData);
  }

  async triggerInventoryLow(inventoryData: any): Promise<void> {
    await this.processEvent('INVENTORY_LOW', inventoryData);
  }

  async triggerPaymentReceived(paymentData: any): Promise<void> {
    await this.processEvent('PAYMENT_RECEIVED', paymentData);
  }

  // Get automation status
  getAutomationStatus(): {
    initialized: boolean;
    active_triggers: number;
    event_types: number;
  } {
    return {
      initialized: this.isInitialized,
      active_triggers: Array.from(this.triggers.values()).flat().filter(t => t.is_active).length,
      event_types: this.triggers.size
    };
  }
}

// Export singleton instance
export const automationCoordinator = AutomationCoordinator.getInstance();

console.log('🎖️ [AUTOMATION COORDINATOR] Master automation system initialized');