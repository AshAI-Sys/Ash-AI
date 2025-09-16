import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateOrderIntake } from '@/lib/ashley-ai/manufacturing-validations'

// Schema for pre-order validation (before creation)
const preValidateOrderSchema = z.object({
  brand_id: z.string().uuid(),
  client_id: z.string().uuid(),
  product_type: z.string(),
  method: z.enum(['SILKSCREEN', 'SUBLIMATION', 'DTF', 'EMBROIDERY']),
  total_qty: z.number().positive(),
  size_curve: z.record(z.string(), z.number()),
  variants: z.array(z.object({
    color: z.string(),
    qty: z.number()
  })).optional(),
  addons: z.array(z.string()).optional(),
  target_delivery_date: z.string().datetime(),
  commercials: z.object({
    unit_price: z.number().positive().optional(),
    deposit_pct: z.number().min(0).max(100).optional(),
    terms: z.string().optional(),
    tax_mode: z.string().optional(),
    currency: z.string().optional()
  }).optional(),
  route_template_key: z.string().optional()
})

// POST /api/orders/validate - Pre-validate order before creation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = preValidateOrderSchema.parse(body)

    // Get route template if specified
    let routingSteps: Array<{
      name: string
      workcenter: string
      sequence: number
      depends_on: string[]
    }> = []

    if (validatedData.route_template_key) {
      // Get default routing steps for the method
      routingSteps = getDefaultRouting(validatedData.method, validatedData.route_template_key)
    } else {
      // Use default routing for method
      routingSteps = getDefaultRouting(validatedData.method)
    }

    // Prepare validation data (using temporary ID for pre-validation)
    const validationData = {
      order_id: 'temp-validation-id',
      method: validatedData.method,
      total_qty: validatedData.total_qty,
      size_curve: validatedData.size_curve,
      variants: validatedData.variants,
      addons: validatedData.addons,
      target_delivery_date: validatedData.target_delivery_date,
      commercials: validatedData.commercials,
      routing_steps: routingSteps
    }

    // Run Ashley AI validation
    const validationResult = await validateOrderIntake(validationData)

    // Return validation result with recommendation
    return NextResponse.json({
      validation_result: validationResult,
      route_recommendation: {
        template_key: validatedData.route_template_key || `${validatedData.method}_DEFAULT`,
        steps: routingSteps
      },
      can_proceed: !validationResult.blocking,
      warnings_count: validationResult.issues.filter(i => i.severity === 'WARN').length,
      errors_count: validationResult.issues.filter(i => i.severity === 'ERROR').length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in order pre-validation:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Validation failed' },
      { status: 500 }
    )
  }
}

// Helper function to get default routing templates
function getDefaultRouting(method: string, templateKey?: string): Array<{
  name: string
  workcenter: string
  sequence: number
  depends_on: string[]
}> {

  const routeTemplates: Record<string, any> = {
    // Silkscreen Option A (default)
    'SILKSCREEN_OPTION_A': [
      { name: 'Cutting', workcenter: 'CUTTING', sequence: 10, depends_on: [] },
      { name: 'Screen Prep', workcenter: 'PRINTING', sequence: 20, depends_on: ['Cutting'] },
      { name: 'Printing', workcenter: 'PRINTING', sequence: 30, depends_on: ['Screen Prep'] },
      { name: 'Curing', workcenter: 'PRINTING', sequence: 35, depends_on: ['Printing'] },
      { name: 'Sewing', workcenter: 'SEWING', sequence: 40, depends_on: ['Curing'] },
      { name: 'QC', workcenter: 'QC', sequence: 50, depends_on: ['Sewing'] },
      { name: 'Packing', workcenter: 'PACKING', sequence: 60, depends_on: ['QC'] }
    ],

    // Silkscreen Option B (guarded by Ashley)
    'SILKSCREEN_OPTION_B': [
      { name: 'Cutting', workcenter: 'CUTTING', sequence: 10, depends_on: [] },
      { name: 'Sewing', workcenter: 'SEWING', sequence: 20, depends_on: ['Cutting'] },
      { name: 'Screen Prep', workcenter: 'PRINTING', sequence: 30, depends_on: ['Sewing'] },
      { name: 'Printing', workcenter: 'PRINTING', sequence: 40, depends_on: ['Screen Prep'] },
      { name: 'Curing', workcenter: 'PRINTING', sequence: 45, depends_on: ['Printing'] },
      { name: 'QC', workcenter: 'QC', sequence: 50, depends_on: ['Curing'] },
      { name: 'Packing', workcenter: 'PACKING', sequence: 60, depends_on: ['QC'] }
    ],

    // Sublimation default
    'SUBLIMATION_DEFAULT': [
      { name: 'Graphic Arts', workcenter: 'DESIGN', sequence: 5, depends_on: [] },
      { name: 'Print to Transfer', workcenter: 'PRINTING', sequence: 10, depends_on: ['Graphic Arts'] },
      { name: 'Heat Press', workcenter: 'HEAT_PRESS', sequence: 20, depends_on: ['Print to Transfer'] },
      { name: 'Cutting', workcenter: 'CUTTING', sequence: 30, depends_on: ['Heat Press'] },
      { name: 'Sewing', workcenter: 'SEWING', sequence: 40, depends_on: ['Cutting'] },
      { name: 'QC', workcenter: 'QC', sequence: 50, depends_on: ['Sewing'] },
      { name: 'Packing', workcenter: 'PACKING', sequence: 60, depends_on: ['QC'] }
    ],

    // DTF default
    'DTF_DEFAULT': [
      { name: 'Receive Plain Tee', workcenter: 'WAREHOUSE', sequence: 5, depends_on: [] },
      { name: 'Print on Film', workcenter: 'PRINTING', sequence: 10, depends_on: [] },
      { name: 'Powder & Cure', workcenter: 'PRINTING', sequence: 20, depends_on: ['Print on Film'] },
      { name: 'Heat Press Transfer', workcenter: 'HEAT_PRESS', sequence: 30, depends_on: ['Powder & Cure', 'Receive Plain Tee'] },
      { name: 'QC', workcenter: 'QC', sequence: 40, depends_on: ['Heat Press Transfer'] },
      { name: 'Packing', workcenter: 'PACKING', sequence: 50, depends_on: ['QC'] }
    ],

    // Embroidery default
    'EMBROIDERY_DEFAULT': [
      { name: 'Digitizing', workcenter: 'DESIGN', sequence: 5, depends_on: [] },
      { name: 'Cutting', workcenter: 'CUTTING', sequence: 10, depends_on: [] },
      { name: 'Embroidery', workcenter: 'EMB', sequence: 20, depends_on: ['Digitizing', 'Cutting'] },
      { name: 'Sewing', workcenter: 'SEWING', sequence: 30, depends_on: ['Embroidery'] },
      { name: 'QC', workcenter: 'QC', sequence: 40, depends_on: ['Sewing'] },
      { name: 'Packing', workcenter: 'PACKING', sequence: 50, depends_on: ['QC'] }
    ]
  }

  // Determine template key
  const key = templateKey || `${method}_DEFAULT`

  return routeTemplates[key] || routeTemplates[`${method}_DEFAULT`] || routeTemplates['SILKSCREEN_OPTION_A']
}