import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// ASH AI Enhanced Order Management System
// Futuristic order intake with AI validation and routing

// Optimized mock data generator for faster loading
function generateOptimizedMockData(limit: number = 50) {
  const statuses = ['DRAFT', 'CONFIRMED', 'IN_PRODUCTION', 'READY_FOR_QC', 'QC_PASSED', 'QC_FAILED', 'READY_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']
  const clients = ['Premium Apparel Co.', 'TechStart Uniforms', 'Fashion Forward Ltd.', 'Urban Style Co.', 'Corporate Solutions Inc.', 'Sports Academy Team', 'Creative Agency Hub', 'Modern Retail Chain']
  const products = ['Custom T-Shirts', 'Hoodies', 'Polo Shirts', 'Jerseys', 'Uniforms', 'Corporate Wear']
  const methods = ['SILKSCREEN', 'DTF', 'SUBLIMATION', 'EMBROIDERY']
  
  return Array.from({ length: Math.min(limit, 100) }, (_, i) => {
    const id = `order_${Date.now()}_${i}`
    const createdDays = Math.floor(Math.random() * 30)
    const dueDays = Math.floor(Math.random() * 30) + 1
    const qty = Math.floor(Math.random() * 500) + 10
    const unitPrice = Math.floor(Math.random() * 500) + 100
    
    return {
      id,
      po_number: `ASH-2025-${String(i + 1).padStart(6, '0')}`,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      product_type: products[Math.floor(Math.random() * products.length)],
      method: methods[Math.floor(Math.random() * methods.length)],
      total_qty: qty,
      created_at: new Date(Date.now() - createdDays * 24 * 60 * 60 * 1000).toISOString(),
      target_delivery_date: new Date(Date.now() + dueDays * 24 * 60 * 60 * 1000).toISOString(),
      client: {
        name: clients[Math.floor(Math.random() * clients.length)],
        company: clients[Math.floor(Math.random() * clients.length)]
      },
      commercials: {
        unit_price: unitPrice,
        currency: 'PHP',
        total_amount: qty * unitPrice
      },
      ai_risk_assessment: Math.random() > 0.8 ? 'urgent_attention_needed' : 
                         Math.random() > 0.6 ? 'potential_delay_risk' : 'on_track',
      progress_percentage: Math.floor(Math.random() * 100),
      priority: Math.random() > 0.7 ? 'HIGH' : Math.random() > 0.4 ? 'MEDIUM' : 'LOW'
    }
  })
}

// Enhanced Order Schema for ASH AI
const createOrderSchema = z.object({
  brand_id: z.string().uuid('Invalid brand ID'),
  client_id: z.string().uuid('Invalid client ID'),
  product_type: z.enum(['Tee', 'Hoodie', 'Jersey', 'Uniform', 'Custom']),
  design_name: z.string().optional(),
  method: z.enum(['SILKSCREEN', 'DTF', 'SUBLIMATION', 'EMBROIDERY']),
  total_qty: z.number().min(1, 'Quantity must be at least 1'),
  size_curve: z.record(z.string(), z.number().min(0)),
  variants: z.array(z.object({
    color: z.string(),
    qty: z.number().min(0)
  })).optional(),
  addons: z.array(z.string()).optional(),
  target_delivery_date: z.string().datetime(),
  commercials: z.object({
    unit_price: z.number().min(0),
    deposit_pct: z.number().min(0).max(100),
    terms: z.string(),
    tax_mode: z.enum(['VAT_INCLUSIVE', 'VAT_EXCLUSIVE']),
    currency: z.string().default('PHP')
  }),
  route_template_key: z.enum(['SILK_OPTION_A', 'SILK_OPTION_B', 'SUBLIMATION_DEFAULT', 'DTF_DEFAULT', 'EMBROIDERY_DEFAULT', 'CUSTOM']).optional(),
  attachments: z.array(z.object({
    type: z.string(),
    file_url: z.string(),
    file_name: z.string()
  })).optional()
})

// GET /api/orders - List orders with AI insights (OPTIMIZED)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const brand_id = searchParams.get('brand_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const optimized = searchParams.get('optimized') === 'true'
    
    console.log('📊 Orders API called with optimized:', optimized)
    
    // If optimized flag is set, return mock data quickly for development
    if (optimized) {
      console.log('⚡ Returning optimized mock data')
      return NextResponse.json({
        success: true,
        data: generateOptimizedMockData(limit),
        meta: {
          total: limit,
          page: 1,
          limit,
          cached: true,
          response_time: '< 50ms'
        }
      })
    }
    
    const workspace_id = 'default'
    
    const orders = await prisma.order.findMany({
      where: {
        workspace_id,
        ...(status && { status: status as any }),
        ...(brand_id && { brand_id })
      },
      include: {
        brand: {
          select: { name: true, code: true }
        },
        client: {
          select: { name: true, company: true }
        },
        routing_steps: {
          select: {
            name: true,
            status: true,
            workcenter: true,
            planned_start: true,
            planned_end: true
          },
          orderBy: { sequence: 'asc' }
        },
        _count: {
          select: { routing_steps: true }
        }
      },
      orderBy: { created_at: 'desc' },
      take: limit
    })

    // AI Enhancement: Calculate order insights
    const ordersWithAI = orders.map(order => {
      const completedSteps = order.routing_steps.filter(step => step.status === 'DONE').length
      const totalSteps = order.routing_steps.length
      const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0
      
      return {
        ...order,
        ai_insights: {
          progress_percentage: Math.round(progress),
          next_step: order.routing_steps.find(step => step.status === 'PLANNED' || step.status === 'READY')?.name,
          estimated_completion: order.routing_steps[order.routing_steps.length - 1]?.planned_end,
          risk_factors: order.ai_risk_assessment || []
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: ordersWithAI,
      meta: {
        total: orders.length,
        ai_enhanced: true,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Order fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

// POST /api/orders - Create new order with automatic task generation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins and managers can create orders
    if (session.user.role !== Role.ADMIN && session.user.role !== Role.MANAGER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Rate limiting
    if (isRateLimited(session.user.id, 20, 60 * 1000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json()
    const {
      clientName,
      brandId,
      designName,
      apparelType,
      quantity,
      sizeBreakdown,
      printMethod,
      sewingType,
      notes,
      mockupUrls = [],
      techPackUrls = [],
      measurementUrls = [],
      placementInstructions = '',
      colorSeparation = { colors: [], instructions: '' },
      customization = { hasNameNumbers: false, customInstructions: '', namesUrls: [] },
      dueDate
    } = body

    // Sanitize and validate input fields
    const sanitizedClientName = sanitizeString(clientName, 100)
    const sanitizedDesignName = sanitizeString(designName || 'Untitled Design', 100)
    const sanitizedApparelType = sanitizeString(apparelType || 'T-Shirt', 50)
    const sanitizedSewingType = sanitizeString(sewingType || 'Standard', 50)
    const sanitizedNotes = sanitizeString(notes || '', 500)
    
    // Validate required fields after sanitization
    if (!sanitizedClientName || !brandId || !sanitizedDesignName || !sanitizedApparelType) {
      return NextResponse.json(
        { error: 'Missing or invalid required fields' },
        { status: 400 }
      )
    }

    // Validate quantity
    const validQuantity = validateNumber(quantity, 1, 10000)
    if (validQuantity === null) {
      return NextResponse.json(
        { error: 'Invalid quantity (must be between 1 and 10000)' },
        { status: 400 }
      )
    }

    // Validate print method
    if (!isValidPrintMethod(printMethod)) {
      return NextResponse.json(
        { error: 'Invalid print method' },
        { status: 400 }
      )
    }

    // Validate brand ID format
    if (!isValidUUID(brandId)) {
      return NextResponse.json(
        { error: 'Invalid brand ID format' },
        { status: 400 }
      )
    }

    // Validate brand exists
    const brand = await prisma.brand.findUnique({
      where: { id: brandId }
    })
    if (!brand) {
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      )
    }

    // Generate order number
    const orderCount = await prisma.order.count()
    const orderNumber = `ORD-${String(orderCount + 1).padStart(4, '0')}`

    // Parse due date
    const parsedDueDate = dueDate ? new Date(dueDate) : undefined

    // Create order and tasks in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the order
      const order = await tx.order.create({
        data: {
          orderNumber,
          clientName: sanitizedClientName,
          brandId,
          designName: sanitizedDesignName,
          apparelType: sanitizedApparelType,
          quantity: validQuantity,
          sizeBreakdown: validateSizeBreakdown(sizeBreakdown) || { 'S': 0, 'M': 0, 'L': 0, 'XL': 0 },
          printMethod,
          sewingType: sanitizedSewingType,
          notes: JSON.stringify({
            generalNotes: sanitizedNotes,
            placementInstructions: sanitizeString(placementInstructions || '', 500),
            colorSeparation: {
              colors: Array.isArray(colorSeparation?.colors) ? colorSeparation.colors.slice(0, 10) : [],
              instructions: sanitizeString(colorSeparation?.instructions || '', 500)
            },
            customization: {
              hasNameNumbers: Boolean(customization?.hasNameNumbers),
              customInstructions: sanitizeString(customization?.customInstructions || '', 500),
              namesUrls: Array.isArray(customization?.namesUrls) ? customization.namesUrls.slice(0, 5) : []
            },
            files: {
              mockupUrls: Array.isArray(mockupUrls) ? mockupUrls.slice(0, 10) : [],
              techPackUrls: Array.isArray(techPackUrls) ? techPackUrls.slice(0, 10) : [],
              measurementUrls: Array.isArray(measurementUrls) ? measurementUrls.slice(0, 10) : []
            }
          }),
          mockupUrl: (Array.isArray(mockupUrls) && mockupUrls[0]) ? mockupUrls[0] : null,
          dueDate: parsedDueDate,
          createdById: session.user.id,
          status: 'CONFIRMED'
        },
        include: {
          brand: true,
          createdBy: {
            select: { id: true, name: true, email: true }
          }
        }
      })

      // Generate tasks based on print method
      const taskData = TaskPipelineService.generateTasksForOrder(
        order.id,
        printMethod,
        parsedDueDate
      )

      // Create tasks
      const tasks = await Promise.all(
        taskData.map(async (taskInfo: { title: string; description: string; type: string; assignedRole: Role; priority: string; dueDate: Date; dependencies?: string[] }) => {
          // Find a user with the required role to assign the task
          const assignee = await tx.user.findFirst({
            where: {
              role: taskInfo.assignedRole,
              active: true
            }
          })

          return tx.task.create({
            data: {
              orderId: order.id,
              assignedTo: assignee?.id,
              taskType: taskInfo.taskType,
              description: taskInfo.description,
              status: taskInfo.status === 'BLOCKED' ? 'PENDING' : 'PENDING', // Start with first task as PENDING
              priority: taskInfo.priority,
              dueDate: taskInfo.dueDate
            }
          })
        })
      )

      return { order, tasks }
    })

    // Update order status to IN_PRODUCTION
    await prisma.order.update({
      where: { id: result.order.id },
      data: { status: 'IN_PRODUCTION' }
    })

    return NextResponse.json({
      message: 'Order created successfully',
      order: result.order,
      tasks: result.tasks,
      estimatedCompletion: TaskPipelineService.getEstimatedCompletionTime(printMethod)
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}