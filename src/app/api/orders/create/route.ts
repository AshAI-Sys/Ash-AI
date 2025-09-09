import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { ashleyAI } from '@/services/ashley-ai'
import { prisma } from '@/lib/prisma'

// POST /api/orders/create - Create new production order with Ashley AI validation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate required fields according to CLIENT_UPDATED_PLAN Stage 1
    const requiredFields = ['brandId', 'productType', 'method', 'totalQty', 'targetDeliveryDate']
    const missingFields = requiredFields.filter(field => !body[field])
    
    if (missingFields.length > 0) {
      return NextResponse.json({ 
        error: 'Missing required fields', 
        fields: missingFields 
      }, { status: 400 })
    }

    // Generate PO number according to CLIENT_UPDATED_PLAN format
    const brand = await prisma.brand.findUnique({ where: { id: body.brandId } })
    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    const year = new Date().getFullYear()
    const sequence = await generateSequenceNumber(body.brandId, year)
    const poNumber = `${brand.code}-${year}-${sequence.toString().padStart(3, '0')}`

    // Ashley AI Validation
    const ashleyValidation = await ashleyAI.validateOrderIntake({
      method: body.method,
      productType: body.productType,
      totalQty: body.totalQty,
      sizeCurve: body.sizeCurve || {},
      targetDeliveryDate: body.targetDeliveryDate,
      routingTemplate: body.routingTemplate || '',
      brandId: body.brandId
    })

    // Check for blocking errors
    const blockingErrors = ashleyValidation.filter(advisory => 
      advisory.type === 'ERROR' && advisory.severity === 'HIGH'
    )

    if (blockingErrors.length > 0 && body.status !== 'DRAFT') {
      return NextResponse.json({
        error: 'Ashley AI validation failed',
        advisories: ashleyValidation,
        blockingErrors
      }, { status: 422 })
    }

    // Create client if new client data provided
    let clientId = body.clientId
    if (body.newClient && !clientId) {
      const client = await prisma.client.create({
        data: {
          name: body.newClient.name,
          company: body.newClient.company,
          email: body.newClient.emails?.[0] || '',
          phone: body.newClient.phones?.[0] || '',
          address: body.newClient.billingAddress ? JSON.stringify(body.newClient.billingAddress) : null
        }
      })
      clientId = client.id
    }

    // Create order according to database schema
    const order = await prisma.order.create({
      data: {
        orderNumber: poNumber,
        clientName: body.clientName || body.newClient?.name || '',
        clientId,
        brandId: body.brandId,
        designName: body.designName || 'Design TBD',
        apparelType: body.productType,
        quantity: body.totalQty,
        sizeBreakdown: body.sizeCurve || {},
        printMethod: body.method,
        sewingType: body.sewingType || 'Standard',
        notes: body.notes || '',
        mockupUrl: body.mockupUrl,
        status: body.status || 'DRAFT',
        dueDate: new Date(body.targetDeliveryDate),
        createdById: session.user.id
      }
    })

    // Create routing steps based on template
    if (body.routingTemplate) {
      await createRoutingSteps(order.id, body.routingTemplate, body.method)
    }

    // Create design assets if provided
    if (body.designAssets && body.designAssets.length > 0) {
      for (const asset of body.designAssets) {
        await prisma.designAsset.create({
          data: {
            orderId: order.id,
            brandId: body.brandId,
            type: asset.type || 'MOCKUP',
            fileUrl: asset.url,
            createdById: session.user.id
          }
        })
      }
    }

    // Log order creation event for Ashley AI
    await prisma.eventLog.create({
      data: {
        eventType: 'ash.po.created',
        entityType: 'order',
        entityId: order.id,
        payload: {
          poNumber,
          method: body.method,
          quantity: body.totalQty,
          ashleyAdvisories: ashleyValidation.length
        }
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE_ORDER',
        entityType: 'Order',
        entityId: order.id,
        details: `Created PO ${poNumber} for ${body.totalQty} ${body.productType} via ${body.method}`,
        metadata: {
          poNumber,
          ashleyValidationCount: ashleyValidation.length,
          hasWarnings: ashleyValidation.some(a => a.type === 'WARNING')
        }
      }
    })

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        poNumber,
        status: order.status
      },
      ashleyAdvisories: ashleyValidation,
      message: `Order ${poNumber} created successfully`
    }, { status: 201 })

  } catch (_error) {
    console.error('Error creating order:', _error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Generate sequence number for PO according to CLIENT_UPDATED_PLAN
async function generateSequenceNumber(brandId: string, year: number): Promise<number> {
  const startOfYear = new Date(year, 0, 1)
  const endOfYear = new Date(year, 11, 31, 23, 59, 59)

  const lastOrder = await prisma.order.findFirst({
    where: {
      brandId,
      created_at: {
        gte: startOfYear,
        lte: endOfYear
      }
    },
    orderBy: { created_at: 'desc' }
  })

  if (!lastOrder) return 1

  // Extract sequence from order number (format: BRAND-YYYY-NNN)
  const parts = lastOrder.orderNumber.split('-')
  const lastSequence = parseInt(parts[2] || '0')
  return lastSequence + 1
}

// Create routing steps based on template
async function createRoutingSteps(orderId: string, templateKey: string, method: string) {
  const routingTemplates = {
    SILK_OPTION_A: [
      { name: 'Cutting', workcenter: 'CUTTING', sequence: 1 },
      { name: 'Printing', workcenter: 'PRINTING', sequence: 2 },
      { name: 'Sewing', workcenter: 'SEWING', sequence: 3 },
      { name: 'Quality Control', workcenter: 'QC', sequence: 4 },
      { name: 'Packing', workcenter: 'PACKING', sequence: 5 }
    ],
    SILK_OPTION_B: [
      { name: 'Cutting', workcenter: 'CUTTING', sequence: 1 },
      { name: 'Sewing', workcenter: 'SEWING', sequence: 2 },
      { name: 'Printing', workcenter: 'PRINTING', sequence: 3 },
      { name: 'Quality Control', workcenter: 'QC', sequence: 4 },
      { name: 'Packing', workcenter: 'PACKING', sequence: 5 }
    ],
    SUBL_DEFAULT: [
      { name: 'Graphic Arts', workcenter: 'DESIGN', sequence: 1 },
      { name: 'Printing', workcenter: 'PRINTING', sequence: 2 },
      { name: 'Heat Press', workcenter: 'HEAT_PRESS', sequence: 3 },
      { name: 'Cutting', workcenter: 'CUTTING', sequence: 4 },
      { name: 'Sewing', workcenter: 'SEWING', sequence: 5 },
      { name: 'Quality Control', workcenter: 'QC', sequence: 6 },
      { name: 'Packing', workcenter: 'PACKING', sequence: 7 }
    ],
    DTF_DEFAULT: [
      { name: 'Receive Plain Tee', workcenter: 'WAREHOUSE', sequence: 1 },
      { name: 'DTF Application', workcenter: 'PRINTING', sequence: 2 },
      { name: 'Quality Control', workcenter: 'QC', sequence: 3 },
      { name: 'Packing', workcenter: 'PACKING', sequence: 4 }
    ],
    EMB_DEFAULT: [
      { name: 'Cutting', workcenter: 'CUTTING', sequence: 1 },
      { name: 'Embroidery', workcenter: 'EMB', sequence: 2 },
      { name: 'Sewing', workcenter: 'SEWING', sequence: 3 },
      { name: 'Quality Control', workcenter: 'QC', sequence: 4 },
      { name: 'Packing', workcenter: 'PACKING', sequence: 5 }
    ]
  }

  const steps = routingTemplates[templateKey as keyof typeof routingTemplates] || routingTemplates.SILK_OPTION_A

  for (const step of steps) {
    await prisma.routingStep.create({
      data: {
        orderId,
        name: step.name,
        workcenter: step.workcenter,
        sequence: step.sequence,
        status: 'PLANNED'
      }
    })
  }
}