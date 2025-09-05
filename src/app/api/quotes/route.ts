import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const quoteSchema = z.object({
  clientName: z.string().min(1, 'Client name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  apparelType: z.string().min(1, 'Apparel type is required'),
  quantity: z.string().min(1, 'Quantity is required'),
  description: z.string().min(1, 'Description is required'),
  designFileUrl: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = quoteSchema.parse(body)

    // Check if client exists, if not create one
    let client = await prisma.client.findUnique({
      where: { email: validatedData.email }
    })

    if (!client) {
      client = await prisma.client.create({
        data: {
          name: validatedData.clientName,
          email: validatedData.email,
          phone: validatedData.phone || null,
          portalAccess: false
        }
      })
    }

    // Create a preliminary order as DRAFT with quote information
    const order = await prisma.order.create({
      data: {
        orderNumber: `QT-${Date.now()}`,
        clientId: client.id,
        clientName: validatedData.clientName,
        brandId: await getDefaultBrand(),
        designName: 'Quote Request',
        apparelType: validatedData.apparelType,
        quantity: parseInt(validatedData.quantity) || 1,
        sizeBreakdown: { notes: validatedData.description },
        printMethod: 'NONE',
        sewingType: 'Standard',
        notes: `Quote Request - ${validatedData.description}`,
        mockupUrl: validatedData.designFileUrl,
        status: 'DRAFT',
        createdById: await getSystemUserId()
      }
    })

    // Create notification task for CSR to follow up
    await prisma.task.create({
      data: {
        orderId: order.id,
        taskType: 'QUOTE_FOLLOW_UP',
        description: `Follow up on quote request from ${validatedData.clientName} - ${validatedData.apparelType} (${validatedData.quantity} pieces)`,
        status: 'PENDING',
        priority: 1
      }
    })

    // Log the quote request
    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entity: 'QuoteRequest',
        entityId: order.id,
        newValues: {
          clientName: validatedData.clientName,
          email: validatedData.email,
          apparelType: validatedData.apparelType,
          quantity: validatedData.quantity
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Quote request submitted successfully',
      quoteNumber: order.orderNumber
    })

  } catch (error) {
    console.error('Quote submission error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid form data', 
          errors: error.errors 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to submit quote request' 
      },
      { status: 500 }
    )
  }
}

async function getDefaultBrand() {
  const brand = await prisma.brand.findFirst({
    where: { code: 'SOR' }
  })
  return brand?.id || 'default'
}

async function getSystemUserId() {
  const systemUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  })
  return systemUser?.id || 'system'
}

export async function GET() {
  try {
    const recentQuotes = await prisma.order.findMany({
      where: {
        orderNumber: {
          startsWith: 'QT-'
        }
      },
      include: {
        client: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })

    return NextResponse.json({
      success: true,
      quotes: recentQuotes
    })

  } catch (error) {
    console.error('Get quotes error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch quotes' 
      },
      { status: 500 }
    )
  }
}