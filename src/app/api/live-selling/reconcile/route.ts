import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const reconcileSchema = z.object({
  saleIds: z.array(z.string()),
  action: z.enum(['reconcile', 'create_order', 'mark_shipped', 'handle_return'])
})

const createOrderSchema = z.object({
  saleId: z.string(),
  orderData: z.object({
    designName: z.string(),
    apparelType: z.string(),
    sizeBreakdown: z.record(z.number()),
    printMethod: z.enum(['SILKSCREEN', 'SUBLIMATION', 'DTF', 'EMBROIDERY']),
    notes: z.string().optional()
  })
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Handle different reconciliation actions
    if (body.action === 'create_order') {
      return handleCreateOrder(body)
    } else if (body.action === 'mark_shipped') {
      return handleMarkShipped(body)
    } else if (body.action === 'handle_return') {
      return handleReturn(body)
    } else {
      return handleReconcile(body)
    }

  } catch (error) {
    console.error('Reconciliation error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid request data', 
          errors: error.errors 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        success: false, 
        message: 'Reconciliation failed' 
      },
      { status: 500 }
    )
  }
}

async function handleReconcile(body: any) {
  const { saleIds } = reconcileSchema.parse(body)
  
  let reconciledCount = 0
  const results: any[] = []

  for (const saleId of saleIds) {
    try {
      const sale = await prisma.platformSale.findFirst({
        where: { 
          id: saleId,
          reconciled: false 
        },
        include: {
          platform: true,
          seller: true
        }
      })

      if (!sale) {
        results.push({ saleId, status: 'error', message: 'Sale not found or already reconciled' })
        continue
      }

      // Try to find matching order based on product name and timing
      const matchingOrder = await findMatchingOrder(sale)
      
      if (matchingOrder) {
        // Link sale to existing order
        await prisma.platformSale.update({
          where: { id: saleId },
          data: {
            reconciled: true,
            reconciledAt: new Date(),
            status: 'CONFIRMED'
          }
        })

        // Update order status if needed
        if (matchingOrder.status === 'DRAFT') {
          await prisma.order.update({
            where: { id: matchingOrder.id },
            data: { status: 'CONFIRMED' }
          })
        }

        results.push({ 
          saleId, 
          status: 'reconciled', 
          orderId: matchingOrder.id,
          orderNumber: matchingOrder.orderNumber 
        })
        reconciledCount++
      } else {
        // No matching order found - needs manual attention
        results.push({ 
          saleId, 
          status: 'manual_required', 
          message: 'No matching order found. Manual reconciliation required.',
          saleInfo: {
            productName: sale.productName,
            quantity: sale.quantity,
            amount: sale.totalAmount,
            platform: sale.platform.name
          }
        })
      }

    } catch (error) {
      results.push({ 
        saleId, 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      })
    }
  }

  // Log reconciliation activity
  await prisma.auditLog.create({
    data: {
      action: 'RECONCILE_PLATFORM_SALES',
      entity: 'PlatformSale',
      newValues: {
        processedSales: saleIds.length,
        reconciledCount,
        results: results.slice(0, 10) // Limit stored results
      }
    }
  })

  return NextResponse.json({
    success: true,
    message: `Processed ${saleIds.length} sales, reconciled ${reconciledCount}`,
    results
  })
}

async function handleCreateOrder(body: any) {
  const { saleId, orderData } = createOrderSchema.parse(body)
  
  const sale = await prisma.platformSale.findUnique({
    where: { id: saleId },
    include: { platform: true }
  })

  if (!sale) {
    return NextResponse.json(
      { success: false, message: 'Sale not found' },
      { status: 404 }
    )
  }

  if (sale.reconciled) {
    return NextResponse.json(
      { success: false, message: 'Sale already reconciled' },
      { status: 400 }
    )
  }

  // Create new order from platform sale
  const order = await prisma.order.create({
    data: {
      orderNumber: `LS-${Date.now()}`,
      clientName: `${sale.platform.name} Customer`,
      brandId: await getDefaultBrandId(),
      designName: orderData.designName,
      apparelType: orderData.apparelType,
      quantity: sale.quantity,
      sizeBreakdown: orderData.sizeBreakdown,
      printMethod: orderData.printMethod,
      sewingType: 'Standard',
      notes: `Live selling order from ${sale.platform.name}. Original sale ID: ${sale.saleId}. ${orderData.notes || ''}`,
      status: 'CONFIRMED',
      createdById: await getSystemUserId()
    }
  })

  // Mark sale as reconciled
  await prisma.platformSale.update({
    where: { id: saleId },
    data: {
      reconciled: true,
      reconciledAt: new Date(),
      status: 'CONFIRMED'
    }
  })

  // Create initial production tasks
  await createProductionTasks(order.id, orderData.printMethod)

  return NextResponse.json({
    success: true,
    message: 'Order created and sale reconciled',
    order: {
      id: order.id,
      orderNumber: order.orderNumber
    }
  })
}

async function handleMarkShipped(body: any) {
  const { saleIds } = reconcileSchema.parse(body)
  
  const updatedSales = await prisma.platformSale.updateMany({
    where: {
      id: { in: saleIds },
      status: 'CONFIRMED'
    },
    data: {
      status: 'SHIPPED'
    }
  })

  // Update related orders if any
  for (const saleId of saleIds) {
    const sale = await prisma.platformSale.findUnique({
      where: { id: saleId }
    })
    
    if (sale) {
      // Find related order and update status
      const relatedOrder = await findMatchingOrder(sale)
      if (relatedOrder && relatedOrder.status !== 'DELIVERED') {
        await prisma.order.update({
          where: { id: relatedOrder.id },
          data: { status: 'READY_FOR_DELIVERY' }
        })
      }
    }
  }

  return NextResponse.json({
    success: true,
    message: `Marked ${updatedSales.count} sales as shipped`
  })
}

async function handleReturn(body: any) {
  const { saleIds, returnData } = body
  
  let processedCount = 0

  for (const saleId of saleIds) {
    const sale = await prisma.platformSale.findUnique({
      where: { id: saleId }
    })

    if (!sale) continue

    // Update sale status
    await prisma.platformSale.update({
      where: { id: saleId },
      data: {
        status: 'RETURNED'
      }
    })

    // Create RMA request if needed
    const client = await findOrCreateClientFromSale(sale)
    
    await prisma.rMARequest.create({
      data: {
        rmaNumber: `RMA-LS-${Date.now()}`,
        clientId: client.id,
        reason: returnData?.reason || 'Platform return',
        quantity: sale.quantity,
        condition: returnData?.condition || 'USED',
        status: 'PENDING',
        refundAmount: sale.netAmount
      }
    })

    processedCount++
  }

  return NextResponse.json({
    success: true,
    message: `Processed ${processedCount} returns`
  })
}

// Helper functions
async function findMatchingOrder(sale: any) {
  // Try to find order by similar product name and timeframe
  const orders = await prisma.order.findMany({
    where: {
      quantity: sale.quantity,
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        lte: new Date()
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  // Simple matching logic - can be enhanced with ML/fuzzy matching
  return orders.find(order => 
    order.designName.toLowerCase().includes(sale.productName.toLowerCase().split(' ')[0]) ||
    order.apparelType.toLowerCase().includes(sale.productName.toLowerCase())
  ) || null
}

async function getDefaultBrandId() {
  const brand = await prisma.brand.findFirst({
    where: { code: 'SOR' }
  })
  return brand?.id || 'default'
}

async function getSystemUserId() {
  const user = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  })
  return user?.id || 'system'
}

async function createProductionTasks(orderId: string, printMethod: string) {
  const tasks = [
    { type: 'DESIGN_APPROVAL', description: 'Review and approve design for live selling order' },
    { type: 'MATERIAL_PREPARATION', description: 'Prepare materials for production' },
    { type: `${printMethod}_PRINTING`, description: `${printMethod} printing task` },
    { type: 'QC_INSPECTION', description: 'Quality control inspection' },
    { type: 'PACKAGING', description: 'Package completed items' }
  ]

  for (let i = 0; i < tasks.length; i++) {
    await prisma.task.create({
      data: {
        orderId,
        taskType: tasks[i].type,
        description: tasks[i].description,
        status: 'PENDING',
        priority: i === 0 ? 2 : 1 // First task higher priority
      }
    })
  }
}

async function findOrCreateClientFromSale(sale: any) {
  // Try to find existing client or create anonymous one
  let client = await prisma.client.findFirst({
    where: {
      email: `${sale.platform.name.toLowerCase()}-customer-${sale.saleId}@platform.com`
    }
  })

  if (!client) {
    client = await prisma.client.create({
      data: {
        name: `${sale.platform.name} Customer`,
        email: `${sale.platform.name.toLowerCase()}-customer-${sale.saleId}@platform.com`,
        company: `${sale.platform.name} Platform Sale`,
        portalAccess: false
      }
    })
  }

  return client
}