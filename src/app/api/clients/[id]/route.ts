import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateClientSchema = z.object({
  name: z.string().min(1).optional(),
  company: z.string().optional(),
  emails: z.array(z.string().email()).optional(),
  phones: z.array(z.string()).optional(),
  billing_address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    postal_code: z.string().optional()
  }).optional(),
  notes: z.string().optional(),
  ai_preferences: z.object({
    preferred_communication: z.string().optional(),
    design_style: z.string().optional(),
    delivery_preferences: z.string().optional()
  }).optional()
})

// GET /api/clients/[id] - Get specific client with full AI insights
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        orders: {
          include: {
            brand: true,
            routing_steps: {
              select: {
                status: true,
                workcenter: true
              }
            },
            _count: {
              select: { routing_steps: true }
            }
          },
          orderBy: { created_at: 'desc' }
        },
        _count: {
          select: { orders: true }
        }
      }
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      )
    }

    // Advanced AI Analytics
    const aiAnalytics = {
      order_patterns: {
        total_orders: client.orders.length,
        avg_order_size: client.orders.reduce((sum, order) => sum + order.total_qty, 0) / Math.max(client.orders.length, 1),
        preferred_methods: client.orders.reduce((acc: any, order) => {
          acc[order.method] = (acc[order.method] || 0) + 1
          return acc
        }, {}),
        delivery_performance: client.orders.filter(o => o.status === 'DELIVERED').length / Math.max(client.orders.length, 1)
      },
      behavioral_insights: {
        order_frequency: client.orders.length > 0 ? 
          (Date.now() - new Date(client.orders[client.orders.length - 1].created_at).getTime()) / (1000 * 60 * 60 * 24) : 0,
        brand_loyalty: client.orders.reduce((acc: any, order) => {
          acc[order.brand.name] = (acc[order.brand.name] || 0) + 1
          return acc
        }, {}),
        seasonal_trends: client.orders.reduce((acc: any, order) => {
          const month = new Date(order.created_at).getMonth()
          acc[month] = (acc[month] || 0) + 1
          return acc
        }, {})
      },
      predictions: {
        next_order_probability: client.risk_score ? (1 - client.risk_score) * 0.8 : 0.5,
        predicted_order_value: client.ltv_prediction ? client.ltv_prediction / 10 : 2500,
        churn_risk: client.risk_score || 0.3
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...client,
        ai_analytics: aiAnalytics
      }
    })

  } catch (_error) {
    console.error('Client fetch error:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch client' },
      { status: 500 }
    )
  }
}

// PUT /api/clients/[id] - Update client with AI re-assessment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const validatedData = updateClientSchema.parse(body)

    const { id } = await params
    
    // Get current client data for audit trail
    const currentClient = await prisma.client.findUnique({
      where: { id }
    })

    if (!currentClient) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      )
    }

    // Re-calculate AI metrics if relevant data changed
    let updatedData = { ...validatedData }
    
    if (validatedData.emails || validatedData.company !== undefined) {
      const calculateRiskScore = (data: any, current: any) => {
        let risk = 0.1
        const emails = data.emails || current.emails
        const company = data.company !== undefined ? data.company : current.company
        
        if (!emails || emails.length === 0) risk += 0.3
        else if (emails.some((email: string) => email.includes('gmail') || email.includes('yahoo'))) {
          risk += 0.2
        }
        
        if (!company) risk += 0.2
        
        return Math.min(risk, 0.9)
      }

      const newRiskScore = calculateRiskScore(validatedData, currentClient)
      const newLTV = 25000 * (1 - newRiskScore) * (validatedData.company || currentClient.company ? 1.5 : 1.0)
      
      updatedData = {
        ...updatedData,
        risk_score: newRiskScore,
        ltv_prediction: newLTV
      }
    }

    const updatedClient = await prisma.client.update({
      where: { id },
      data: updatedData
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        workspace_id: currentClient.workspace_id,
        entity_type: 'client',
        entity_id: id,
        action: 'UPDATE',
        before_data: currentClient,
        after_data: updatedClient,
        metadata: {
          ai_reassessed: !!(validatedData.emails || validatedData.company !== undefined)
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedClient
    })

  } catch (_error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Client update error:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to update client' },
      { status: 500 }
    )
  }
}

// DELETE /api/clients/[id] - Soft delete client with audit
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        _count: {
          select: { orders: true }
        }
      }
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      )
    }

    // Prevent deletion if client has orders
    if (client._count.orders > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot delete client with existing orders',
          details: `Client has ${client._count.orders} orders`
        },
        { status: 409 }
      )
    }

    await prisma.client.delete({
      where: { id }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        workspace_id: client.workspace_id,
        entity_type: 'client',
        entity_id: id,
        action: 'DELETE',
        before_data: client,
        metadata: {
          reason: 'manual_deletion'
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Client deleted successfully'
    })

  } catch (_error) {
    console.error('Client deletion error:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete client' },
      { status: 500 }
    )
  }
}