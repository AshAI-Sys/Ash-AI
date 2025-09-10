/**
 * ASH AI - Order Status State Machine
 * Professional order lifecycle management with AI-powered transitions
 */

import { PrismaClient, OrderStatus, Role } from '@prisma/client'
import { nanoid } from 'nanoid'

const prisma = new PrismaClient()

export interface OrderStateTransition {
  from: OrderStatus
  to: OrderStatus
  action: string
  requiredRole?: Role[]
  conditions?: (order: any, context: any) => Promise<boolean>
  onTransition?: (order: any, context: any) => Promise<void>
  description: string
}

export interface TransitionContext {
  user_id: string
  userRole: Role
  reason?: string
  metadata?: any
}

export interface StateTransitionResult {
  success: boolean
  message: string
  newStatus?: OrderStatus
  blockedBy?: string[]
  warnings?: string[]
}

/**
 * ASH AI Order State Machine Definition
 * Based on CLIENT_UPDATED_PLAN.md specifications
 */
export const ORDER_STATE_TRANSITIONS: OrderStateTransition[] = [
  // 1. INTAKE → DESIGN_PENDING
  {
    from: OrderStatus.INTAKE,
    to: OrderStatus.DESIGN_PENDING,
    action: 'submit_for_design',
    requiredRole: [Role.CSR, Role.ADMIN, Role.MANAGER],
    conditions: async (order) => {
      // Must have basic order info
      return !!(order.client_id && order.brand_id && order.total_qty > 0)
    },
    onTransition: async (order, _context) => {
      // Create initial design asset placeholder
      await createDesignAssetPlaceholder(order.id, context.user_id)
      
      // Notify design team
      await notifyDesignTeam(order.id)
    },
    description: 'Submit order for design work'
  },

  // 2. DESIGN_PENDING → DESIGN_APPROVAL (when design is uploaded)
  {
    from: OrderStatus.DESIGN_PENDING,
    to: OrderStatus.DESIGN_APPROVAL,
    action: 'upload_design',
    requiredRole: [Role.GRAPHIC_ARTIST, Role.ADMIN, Role.MANAGER],
    conditions: async (order) => {
      // Must have at least one design asset
      const designAssets = await prisma.designAsset.count({
        where: { order_id: order.id }
      })
      return designAssets > 0
    },
    onTransition: async (order, _context) => {
      // Set portal visibility for client approval
      await prisma.order.update({
        where: { id: order.id },
        data: { portal_visible: true }
      })
      
      // Notify client of design ready for approval
      await notifyClientDesignReady(order.id)
    },
    description: 'Design uploaded and ready for client approval'
  },

  // 3. DESIGN_APPROVAL → PRODUCTION_PLANNED (client approves or internal approval)
  {
    from: OrderStatus.DESIGN_APPROVAL,
    to: OrderStatus.PRODUCTION_PLANNED,
    action: 'approve_design',
    requiredRole: [Role.CSR, Role.ADMIN, Role.MANAGER], // Internal approval, client approval handled separately
    conditions: async (order) => {
      // Check if design is approved (client or internal)
      const approvedDesigns = await prisma.designAsset.count({
        where: { 
          order_id: order.id,
          approval_status: 'APPROVED'
        }
      })
      return approvedDesigns > 0
    },
    onTransition: async (order, _context) => {
      // Apply routing template and create routing steps
      await applyRoutingTemplate(order.id)
      
      // Run Ashley AI capacity planning
      await runCapacityPlanning(order.id)
      
      // Generate production timeline
      await generateProductionTimeline(order.id)
    },
    description: 'Design approved and production planned'
  },

  // 4. PRODUCTION_PLANNED → IN_PROGRESS (production starts)
  {
    from: OrderStatus.PRODUCTION_PLANNED,
    to: OrderStatus.IN_PROGRESS,
    action: 'start_production',
    requiredRole: [Role.ADMIN, Role.MANAGER],
    conditions: async (order) => {
      // Must have routing steps ready
      const routingSteps = await prisma.routingStep.count({
        where: { order_id: order.id }
      })
      return routingSteps > 0
    },
    onTransition: async (order, _context) => {
      // Mark first routing step as READY
      await prisma.routingStep.updateMany({
        where: { 
          order_id: order.id,
          sequence: 1
        },
        data: { status: 'READY' }
      })
      
      // Create initial production tasks
      await createProductionTasks(order.id)
    },
    description: 'Production started'
  },

  // 5. IN_PROGRESS → QC (production complete, ready for QC)
  {
    from: OrderStatus.IN_PROGRESS,
    to: OrderStatus.QC,
    action: 'complete_production',
    requiredRole: [Role.ADMIN, Role.MANAGER, Role.SEWING_OPERATOR],
    conditions: async (order) => {
      // All routing steps must be DONE
      const totalSteps = await prisma.routingStep.count({
        where: { order_id: order.id }
      })
      const completedSteps = await prisma.routingStep.count({
        where: { 
          order_id: order.id,
          status: 'DONE'
        }
      })
      return totalSteps > 0 && completedSteps === totalSteps
    },
    onTransition: async (order, _context) => {
      // Create QC inspection tasks
      await createQCTasks(order.id)
      
      // Notify QC team
      await notifyQCTeam(order.id)
    },
    description: 'Production completed, ready for quality control'
  },

  // 6. QC → PACKING (QC passed)
  {
    from: OrderStatus.QC,
    to: OrderStatus.PACKING,
    action: 'pass_qc',
    requiredRole: [Role.QC_INSPECTOR, Role.ADMIN, Role.MANAGER],
    conditions: async (order) => {
      // Must have passing QC record
      const passingQC = await prisma.qCRecord.findFirst({
        where: { 
          order_id: order.id,
          passed: true
        }
      })
      return !!passingQC
    },
    onTransition: async (order, _context) => {
      // Create packing tasks
      await createPackingTasks(order.id)
      
      // Generate shipping labels
      await generateShippingLabels(order.id)
    },
    description: 'Quality control passed, ready for packing'
  },

  // 7. PACKING → READY_FOR_DELIVERY (packed and ready)
  {
    from: OrderStatus.PACKING,
    to: OrderStatus.READY_FOR_DELIVERY,
    action: 'complete_packing',
    requiredRole: [Role.WAREHOUSE_STAFF, Role.ADMIN, Role.MANAGER],
    conditions: async (order) => {
      // All items must be packed (implementation specific)
      return true // Simplified for now
    },
    onTransition: async (order, _context) => {
      // Schedule delivery
      await scheduleDelivery(order.id)
      
      // Notify client order ready
      await notifyClientOrderReady(order.id)
    },
    description: 'Order packed and ready for delivery'
  },

  // 8. READY_FOR_DELIVERY → DELIVERED (delivered to client)
  {
    from: OrderStatus.READY_FOR_DELIVERY,
    to: OrderStatus.DELIVERED,
    action: 'mark_delivered',
    requiredRole: [Role.DRIVER, Role.ADMIN, Role.MANAGER],
    conditions: async (order) => {
      // Must have delivery record
      const delivery = await prisma.delivery.findFirst({
        where: { order_id: order.id }
      })
      return !!delivery
    },
    onTransition: async (order, _context) => {
      // Update delivery record
      await prisma.delivery.updateMany({
        where: { order_id: order.id },
        data: { 
          status: 'COMPLETED',
          completed_at: new Date()
        }
      })
      
      // Generate invoice
      await generateInvoice(order.id)
    },
    description: 'Order delivered to client'
  },

  // 9. DELIVERED → CLOSED (payment received, order complete)
  {
    from: OrderStatus.DELIVERED,
    to: OrderStatus.CLOSED,
    action: 'close_order',
    requiredRole: [Role.ADMIN, Role.MANAGER, Role.BOOKKEEPER],
    conditions: async (order) => {
      // Payment should be complete (simplified)
      return true
    },
    onTransition: async (order, _context) => {
      // Final order closure tasks
      await finalizeOrderClosure(order.id)
      
      // Update client LTV and analytics
      await updateClientAnalytics(order.client_id)
    },
    description: 'Order completed and closed'
  },

  // Emergency transitions
  // Any status → ON_HOLD
  {
    from: OrderStatus.INTAKE, // This represents "any status" - will be handled in logic
    to: OrderStatus.ON_HOLD,
    action: 'put_on_hold',
    requiredRole: [Role.ADMIN, Role.MANAGER],
    conditions: async () => true, // Always allowed
    onTransition: async (order, _context) => {
      // Log hold reason
      await logOrderHold(order.id, context.reason || 'No reason provided', context.user_id)
    },
    description: 'Put order on hold'
  },

  // ON_HOLD → Previous status (resume)
  {
    from: OrderStatus.ON_HOLD,
    to: OrderStatus.INTAKE, // Dynamic - will be determined by previous status
    action: 'resume_order',
    requiredRole: [Role.ADMIN, Role.MANAGER],
    conditions: async () => true,
    onTransition: async (order, _context) => {
      // Resume order processing
      await logOrderResume(order.id, context.user_id)
    },
    description: 'Resume order from hold'
  },

  // Any status → CANCELLED
  {
    from: OrderStatus.INTAKE, // Represents "any status"
    to: OrderStatus.CANCELLED,
    action: 'cancel_order',
    requiredRole: [Role.ADMIN, Role.MANAGER],
    conditions: async (order) => {
      // Cannot cancel if already delivered
      return order.status !== OrderStatus.DELIVERED
    },
    onTransition: async (order, _context) => {
      // Handle order cancellation
      await handleOrderCancellation(order.id, context.reason || 'No reason provided', context.user_id)
    },
    description: 'Cancel order'
  }
]

/**
 * Main function to transition order status
 */
export async function transitionOrderStatus(
  order_id: string,
  action: string,
  context: TransitionContext
): Promise<StateTransitionResult> {
  try {
    // Get current order
    const order = await prisma.order.findUnique({
      where: { id: order_id },
      include: {
        routing_steps: true,
        design_assets: true
      }
    })

    if (!order) {
      return {
        success: false,
        message: 'Order not found'
      }
    }

    // Find valid transitions for current status and action
    const validTransitions = ORDER_STATE_TRANSITIONS.filter(t => 
      (t.from === order.status || (action === 'put_on_hold' || action === 'cancel_order')) && 
      t.action === action
    )

    if (validTransitions.length === 0) {
      return {
        success: false,
        message: `Invalid action "${action}" for status "${order.status}"`
      }
    }

    const transition = validTransitions[0]

    // Check role permissions
    if (transition.requiredRole && !transition.requiredRole.includes(context.userRole)) {
      return {
        success: false,
        message: `Access denied. Required roles: ${transition.requiredRole.join(', ')}`
      }
    }

    // Check conditions
    if (transition.conditions && !(await transition.conditions(order, context))) {
      return {
        success: false,
        message: 'Transition conditions not met',
        blockedBy: ['Conditions check failed']
      }
    }

    // Determine target status (special handling for hold/resume)
    let targetStatus = transition.to
    if (action === 'resume_order') {
      // Get previous status from audit log
      targetStatus = await getPreviousStatus(order_id) || OrderStatus.INTAKE
    }

    // Perform the transition
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Update order status
      const updated = await tx.order.update({
        where: { id: order_id },
        data: { 
          status: targetStatus,
          updated_at: new Date()
        }
      })

      // Log audit trail
      await tx.auditLog.create({
        data: {
          id: nanoid(),
          workspace_id: order.workspace_id,
          actor_id: context.user_id,
          entity_type: 'order',
          entity_id: order_id,
          action: 'STATUS_CHANGE',
          before_data: { status: order.status },
          after_data: { status: targetStatus },
          metadata: {
            action_taken: action,
            reason: context.reason,
            transition_description: transition.description
          }
        }
      })

      return updated
    })

    // Execute post-transition actions
    if (transition.onTransition) {
      await transition.onTransition(updatedOrder, context)
    }

    return {
      success: true,
      message: `Order transitioned to ${targetStatus}`,
      newStatus: targetStatus
    }

  } catch (_error) {
    console.error('Error transitioning order status:', _error)
    return {
      success: false,
      message: 'Failed to transition order status'
    }
  }
}

/**
 * Get valid transitions for an order's current status
 */
export async function getValidTransitions(order_id: string, userRole: Role): Promise<OrderStateTransition[]> {
  const order = await prisma.order.findUnique({
    where: { id: order_id }
  })

  if (!order) return []

  return ORDER_STATE_TRANSITIONS.filter(t => 
    (t.from === order.status || (t.action === 'put_on_hold' || t.action === 'cancel_order')) &&
    (!t.requiredRole || t.requiredRole.includes(userRole))
  )
}

// Helper functions for transition actions
async function createDesignAssetPlaceholder(order_id: string, user_id: string) {
  await prisma.designAsset.create({
    data: {
      id: nanoid(),
      order_id: order_id,
      version: 1,
      type: 'MOCKUP',
      file_url: 'placeholder://pending-design',
      file_name: 'pending-design.placeholder',
      approval_status: 'OPEN'
    }
  })
}

async function notifyDesignTeam(order_id: string) {
  // Implementation: Send notification to design team
  console.log(`🎨 Design team notified for order ${order_id}`)
}

async function notifyClientDesignReady(order_id: string) {
  // Implementation: Send email to client with portal link
  console.log(`📧 Client notified - design ready for approval: ${order_id}`)
}

async function applyRoutingTemplate(order_id: string) {
  // Implementation: Create routing steps from template
  console.log(`🛣️ Routing template applied for order ${order_id}`)
}

async function runCapacityPlanning(order_id: string) {
  // Implementation: Ashley AI capacity analysis
  console.log(`🤖 Ashley AI capacity planning for order ${order_id}`)
}

async function generateProductionTimeline(order_id: string) {
  // Implementation: Generate production timeline
  console.log(`📅 Production timeline generated for order ${order_id}`)
}

async function createProductionTasks(order_id: string) {
  // Implementation: Create production tasks
  console.log(`📋 Production tasks created for order ${order_id}`)
}

async function createQCTasks(order_id: string) {
  // Implementation: Create QC inspection tasks
  console.log(`🔍 QC tasks created for order ${order_id}`)
}

async function notifyQCTeam(order_id: string) {
  console.log(`🔍 QC team notified for order ${order_id}`)
}

async function createPackingTasks(order_id: string) {
  console.log(`📦 Packing tasks created for order ${order_id}`)
}

async function generateShippingLabels(order_id: string) {
  console.log(`🏷️ Shipping labels generated for order ${order_id}`)
}

async function scheduleDelivery(order_id: string) {
  console.log(`🚚 Delivery scheduled for order ${order_id}`)
}

async function notifyClientOrderReady(order_id: string) {
  console.log(`📧 Client notified - order ready for delivery: ${order_id}`)
}

async function generateInvoice(order_id: string) {
  console.log(`💰 Invoice generated for order ${order_id}`)
}

async function finalizeOrderClosure(order_id: string) {
  console.log(`✅ Order closure finalized for ${order_id}`)
}

async function updateClientAnalytics(client_id: string) {
  console.log(`📊 Client analytics updated for ${client_id}`)
}

async function logOrderHold(order_id: string, reason: string, user_id: string) {
  console.log(`⏸️ Order ${order_id} put on hold: ${reason}`)
}

async function logOrderResume(order_id: string, user_id: string) {
  console.log(`▶️ Order ${order_id} resumed`)
}

async function handleOrderCancellation(order_id: string, reason: string, user_id: string) {
  console.log(`❌ Order ${order_id} cancelled: ${reason}`)
}

async function getPreviousStatus(order_id: string): Promise<OrderStatus | null> {
  const lastTransition = await prisma.auditLog.findFirst({
    where: {
      entity_type: 'order',
      entity_id: order_id,
      action: 'STATUS_CHANGE'
    },
    orderBy: { created_at: 'desc' },
    skip: 1 // Skip the current status change
  })

  return (lastTransition?.before_data as any)?.status || null
}