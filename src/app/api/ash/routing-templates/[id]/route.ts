/**
 * ASH AI - Individual Routing Template API
 * Manage specific routing template with AI optimization
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'
import { z } from 'zod'
import { validateAshleyRoutingOptimization } from '@/lib/ash/ashley-ai'

const updateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.string().min(1).optional(),
  is_default: z.boolean().optional(),
  is_active: z.boolean().optional(),
  steps: z.array(z.object({
    id: z.string().optional(), // For existing steps
    name: z.string().min(1, 'Step name is required'),
    description: z.string().optional(),
    workcenter: z.string().min(1, 'Workcenter is required'),
    sequence: z.number().min(1),
    standard_spec: z.object({
      duration_minutes: z.number().min(0),
      setup_minutes: z.number().min(0).default(0),
      capacity_per_hour: z.number().min(0).default(1),
      skill_requirements: z.array(z.string()).default([]),
      equipment_requirements: z.array(z.string()).default([]),
      quality_checkpoints: z.array(z.string()).default([])
    }),
    _action: z.enum(['create', 'update', 'delete']).optional()
  })).optional()
})

/**
 * GET /api/ash/routing-templates/[id] - Get routing template details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const templateId = id

    const template = await prisma.routeTemplate.findFirst({
      where: {
        id: templateId,
        workspace_id: session.user.workspaceId
      },
      include: {
        created_by: {
          select: {
            full_name: true,
            email: true
          }
        },
        steps: {
          select: {
            id: true,
            name: true,
            description: true,
            workcenter: true,
            sequence: true,
            standard_spec: true,
            created_at: true
          },
          orderBy: {
            sequence: 'asc'
          }
        },
        _count: {
          select: {
            orders: true
          }
        }
      }
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Get Ashley AI analysis
    let ashleyAnalysis = null
    if (template.steps.length > 0) {
      try {
        ashleyAnalysis = await validateAshleyRoutingOptimization({
          templateId: template.id,
          steps: template.steps,
          category: template.category
        })
      } catch (_error) {
        console.error('Error analyzing template:', error)
      }
    }

    // Get usage statistics
    const usageStats = await prisma.order.groupBy({
      by: ['status'],
      where: {
        routing_template_id: templateId,
        workspace_id: session.user.workspaceId
      },
      _count: true
    })

    return NextResponse.json({
      success: true,
      template: {
        ...template,
        ashley_analysis: ashleyAnalysis,
        usage_stats: {
          total_orders: template._count.orders,
          status_breakdown: usageStats.reduce((acc, stat) => {
            acc[stat.status] = stat._count
            return acc
          }, {} as Record<string, number>)
        }
      }
    })

  } catch (_error) {
    console.error('Error fetching routing template:', error)
    return NextResponse.json(
      { error: 'Failed to fetch routing template' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/ash/routing-templates/[id] - Update routing template
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only certain roles can modify routing templates
    if (![Role.ADMIN, Role.MANAGER, Role.PRODUCTION_MANAGER].includes(session.user.role as Role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const templateId = id
    const body = await request.json()
    const validatedData = updateTemplateSchema.parse(body)

    // Get existing template
    const existingTemplate = await prisma.routeTemplate.findFirst({
      where: {
        id: templateId,
        workspace_id: session.user.workspaceId
      },
      include: {
        steps: true
      }
    })

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Check if template is in use and prevent breaking changes
    const ordersUsingTemplate = await prisma.order.count({
      where: {
        routing_template_id: templateId,
        status: {
          in: ['INTAKE', 'DESIGN_PENDING', 'DESIGN_APPROVAL', 'PRODUCTION_PLANNED', 'IN_PROGRESS']
        }
      }
    })

    if (ordersUsingTemplate > 0 && validatedData.steps) {
      // Validate that changes won't break existing orders
      const currentStepIds = existingTemplate.steps.map(s => s.id)
      const newStepIds = validatedData.steps.filter(s => s.id).map(s => s.id)
      const removedSteps = currentStepIds.filter(id => !newStepIds.includes(id))
      
      if (removedSteps.length > 0) {
        return NextResponse.json({
          success: false,
          error: 'Cannot remove steps from template while orders are in progress',
          orders_affected: ordersUsingTemplate,
          removed_steps: removedSteps
        }, { status: 422 })
      }
    }

    // Validate routing with Ashley AI if steps are being updated
    let ashleyAnalysis = null
    if (validatedData.steps) {
      ashleyAnalysis = await validateAshleyRoutingOptimization({
        templateId,
        steps: validatedData.steps,
        category: validatedData.category || existingTemplate.category
      })

      // Block update if Ashley detects critical issues
      const criticalIssues = ashleyAnalysis.bottlenecks?.filter(b => b.severity === 'CRITICAL') || []
      if (criticalIssues.length > 0) {
        return NextResponse.json({
          success: false,
          error: 'Ashley AI detected critical routing issues',
          ashley_analysis: ashleyAnalysis,
          blocked_by: 'ASHLEY_AI_CRITICAL_ISSUES',
          critical_issues: criticalIssues
        }, { status: 422 })
      }
    }

    // Update template in transaction
    const updatedTemplate = await prisma.$transaction(async (tx) => {
      // If setting as default, unset other defaults in category
      if (validatedData.is_default === true) {
        await tx.routeTemplate.updateMany({
          where: {
            workspace_id: session.user.workspaceId,
            category: validatedData.category || existingTemplate.category,
            is_default: true,
            id: { not: templateId }
          },
          data: { is_default: false }
        })
      }

      // Update template
      const updated = await tx.routeTemplate.update({
        where: { id: templateId },
        data: {
          ...(validatedData.name && { name: validatedData.name }),
          ...(validatedData.description !== undefined && { description: validatedData.description }),
          ...(validatedData.category && { category: validatedData.category }),
          ...(validatedData.is_default !== undefined && { is_default: validatedData.is_default }),
          ...(validatedData.is_active !== undefined && { is_active: validatedData.is_active }),
          ...(ashleyAnalysis && {
            ai_optimization_data: {
              ashley_analysis: ashleyAnalysis,
              optimization_version: 'v2.1.3',
              updated_at: new Date().toISOString()
            }
          }),
          updated_at: new Date()
        }
      })

      // Update steps if provided
      if (validatedData.steps) {
        // Delete removed steps
        const currentStepIds = existingTemplate.steps.map(s => s.id)
        const newStepIds = validatedData.steps.filter(s => s.id).map(s => s.id)
        const toDelete = currentStepIds.filter(id => !newStepIds.includes(id))
        
        if (toDelete.length > 0) {
          await tx.routingStep.deleteMany({
            where: {
              id: { in: toDelete },
              route_template_id: templateId
            }
          })
        }

        // Update existing and create new steps
        for (const step of validatedData.steps) {
          if (step.id) {
            // Update existing step
            await tx.routingStep.update({
              where: { id: step.id },
              data: {
                name: step.name,
                description: step.description,
                workcenter: step.workcenter,
                sequence: step.sequence,
                standard_spec: step.standard_spec
              }
            })
          } else {
            // Create new step
            await tx.routingStep.create({
              data: {
                id: crypto.randomUUID(),
                workspace_id: session.user.workspaceId,
                route_template_id: templateId,
                name: step.name,
                description: step.description,
                workcenter: step.workcenter,
                sequence: step.sequence,
                standard_spec: step.standard_spec
              }
            })
          }
        }
      }

      return updated
    })

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        id: (await import('nanoid')).nanoid(),
        workspace_id: session.user.workspaceId,
        actor_id: session.user.id,
        entity_type: 'route_template',
        entity_id: templateId,
        action: 'UPDATE',
        before_data: existingTemplate,
        after_data: validatedData,
        metadata: {
          source: 'routing_templates_api',
          ashley_analysis: ashleyAnalysis,
          steps_modified: !!validatedData.steps,
          orders_affected: ordersUsingTemplate
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Routing template updated successfully',
      template: {
        ...updatedTemplate,
        ashley_analysis: ashleyAnalysis
      }
    })

  } catch (_error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }

    console.error('Error updating routing template:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update routing template'
    }, { status: 500 })
  }
}

/**
 * DELETE /api/ash/routing-templates/[id] - Delete routing template
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can delete routing templates
    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const { id } = await params
    const templateId = id

    // Check if template exists
    const template = await prisma.routeTemplate.findFirst({
      where: {
        id: templateId,
        workspace_id: session.user.workspaceId
      }
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Check if template is in use
    const ordersUsingTemplate = await prisma.order.count({
      where: {
        routing_template_id: templateId
      }
    })

    if (ordersUsingTemplate > 0) {
      return NextResponse.json({
        success: false,
        error: 'Cannot delete template that is in use by orders',
        orders_count: ordersUsingTemplate
      }, { status: 422 })
    }

    // Delete template and steps
    await prisma.$transaction(async (tx) => {
      await tx.routingStep.deleteMany({
        where: { route_template_id: templateId }
      })

      await tx.routeTemplate.delete({
        where: { id: templateId }
      })
    })

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        id: (await import('nanoid')).nanoid(),
        workspace_id: session.user.workspaceId,
        actor_id: session.user.id,
        entity_type: 'route_template',
        entity_id: templateId,
        action: 'DELETE',
        before_data: template,
        metadata: {
          source: 'routing_templates_api',
          reason: 'Template deletion'
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Routing template deleted successfully'
    })

  } catch (_error) {
    console.error('Error deleting routing template:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete routing template'
    }, { status: 500 })
  }
}