// @ts-nocheck
/**
 * ASH AI - Routing Templates API
 * Professional routing template management with AI optimization
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { validateAshleyRoutingOptimization } from '@/lib/ash/ashley-ai'

const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  is_default: z.boolean().default(false),
  is_active: z.boolean().default(true),
  steps: z.array(z.object({
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
    })
  })).min(1, 'At least one step is required')
})

/**
 * GET /api/ash/routing-templates - List routing templates
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const _category = searchParams.get('category')
    const active_only = searchParams.get('active_only') === 'true'
    const include_steps = searchParams.get('include_steps') === 'true'

    const templates = await prisma.routeTemplate.findMany({
      where: {
        workspace_id: session.user.workspace_id,
        ...(_category && { category: _category }),
        ...(active_only && { is_active: true })
      },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        steps: include_steps ? {
          select: {
            id: true,
            name: true,
            workcenter: true,
            sequence: true,
            standard_spec: true
          },
          orderBy: {
            sequence: 'asc'
          }
        } : false,
        _count: {
          select: {
            steps: true,
            orders: true
          }
        }
      },
      orderBy: [
        { name: 'asc' }
      ]
    })

    // Add Ashley AI efficiency analysis for each template
    const templatesWithAnalysis = await Promise.all(
      templates.map(async (template) => {
        if (!include_steps || !(template as any).steps) {
          return {
            ...template,
            ai_analysis: null
          }
        }

        try {
          const analysis = await validateAshleyRoutingOptimization({
            template_id: template.id,
            steps: (template as any).steps,
            category: template.category
          })

          return {
            ...template,
            ai_analysis: {
              efficiency_score: analysis.efficiencyScore,
              bottlenecks: analysis.bottlenecks,
              optimizations: analysis.optimizations,
              estimated_lead_time: analysis.estimatedLeadTime
            }
          }
        } catch (_error) {
          console.error('Error analyzing template:', template.id, _error)
          return {
            ...template,
            ai_analysis: null
          }
        }
      })
    )

    return NextResponse.json({
      success: true,
      templates: templatesWithAnalysis,
      meta: {
        total: templates.length,
        active: templates.filter(t => t.is_active).length,
        categories: [...new Set(templates.map(t => t.category))]
      }
    })

  } catch (_error) {
    console.error('Error fetching routing templates:', _error)
    return NextResponse.json(
      { error: 'Failed to fetch routing templates' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/ash/routing-templates - Create new routing template
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only certain roles can create routing templates
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createTemplateSchema.parse(body)

    // Validate routing with Ashley AI
    const ashleyAnalysis = await validateAshleyRoutingOptimization({
      // @ts-ignore
      steps: validatedData.steps,
      category: validatedData.category
    })

    // Block creation if Ashley detects critical issues
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

    // Generate template ID
    const template_id = crypto.randomUUID()

    // Create template with steps in transaction
    const template = await prisma.$transaction(async (tx) => {
      // Note: is_default functionality removed - not in schema

      // Create the template
      const newTemplate = await tx.routeTemplate.create({
        data: {
          id: template_id,
          workspace_id: session.user.workspace_id,
          name: validatedData.name,
          description: validatedData.description,
          category: validatedData.category,
          is_active: validatedData.is_active || true
          // Note: removed is_default, created_by_id, ai_optimization_data - not in schema
        }
      })

      // Create routing steps
      await Promise.all(
        validatedData.steps.map(step =>
          tx.routeTemplateStep.create({
            data: {
              route_template_id: template_id,
              name: step.name,
              workcenter: step.workcenter as any, // Cast to WorkcenterType
              sequence: step.sequence,
              standard_spec: step.standard_spec || {}
            }
          })
        )
      )

      return newTemplate
    })

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        workspace_id: session.user.workspace_id,
        actor_id: session.user.id,
        entity_type: 'route_template',
        entity_id: template_id,
        action: 'CREATE',
        after_data: {
          template: JSON.parse(JSON.stringify(validatedData)),
          ashley_analysis: ashleyAnalysis ? JSON.parse(JSON.stringify(ashleyAnalysis)) : null,
          metadata: {
            source: 'routing_templates_api',
            ashley_efficiency_score: ashleyAnalysis.efficiencyScore,
            step_count: validatedData.steps.length
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Routing template created successfully',
      template: {
        ...template,
        ashley_analysis: ashleyAnalysis
      }
    }, { status: 201 })

  } catch (_error) {
    if (_error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: _error.errors
      }, { status: 400 })
    }

    console.error('Error creating routing template:', _error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create routing template'
    }, { status: 500 })
  }
}