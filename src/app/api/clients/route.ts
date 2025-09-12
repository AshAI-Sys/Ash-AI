// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Futuristic Client Management API with AI Integration
const clientSchema = z.object({
  name: z.string().min(1, 'Client name is required'),
  company: z.string().optional(),
  emails: z.array(z.string().email()).default([]),
  phones: z.array(z.string()).default([]),
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

// GET /api/clients - List all clients with AI insights
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    
    const workspace_id = 'default' // Multi-tenant ready
    
    const clients = await prisma.client.findMany({
      where: {
        workspace_id,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { company: { contains: search, mode: 'insensitive' } }
          ]
        })
      },
      include: {
        orders: {
          select: {
            id: true,
            po_number: true,
            total_qty: true,
            status: true,
            created_at: true
          },
          orderBy: { created_at: 'desc' },
          take: 5
        },
        _count: {
          select: { orders: true }
        }
      },
      take: limit,
      orderBy: { created_at: 'desc' }
    })

    // AI Enhancement: Calculate client metrics
    const clientsWithAI = clients.map(client => ({
      ...client,
      ai_insights: {
        total_orders: client._count.orders,
        avg_order_value: client.orders.reduce((sum, order) => sum + order.total_qty, 0) / Math.max(client.orders.length, 1),
        last_order_date: client.orders[0]?.created_at,
        client_status: client.orders.length > 0 ? 'ACTIVE' : 'INACTIVE',
        predicted_ltv: client.risk_score ? (1 - client.risk_score) * 50000 : 25000 // AI prediction
      }
    }))

    return NextResponse.json({
      success: true,
      data: clientsWithAI,
      meta: {
        total: clients.length,
        ai_enhanced: true,
        timestamp: new Date().toISOString()
      }
    })

  } catch (_error) {
    console.error('Client fetch error:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch clients' },
      { status: 500 }
    )
  }
}

// POST /api/clients - Create new client with AI risk assessment
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Authorization check - only admin/manager/csr can create clients
    if (![Role.ADMIN, Role.MANAGER, Role.CSR].includes(session.user.role as Role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = clientSchema.parse(body)
    
    const workspace_id = 'default' // Multi-tenant ready
    
    // AI Risk Assessment based on email domain and company info
    const calculateRiskScore = (data: any) => {
      let risk = 0.1 // Base risk
      
      // Email domain analysis
      if (data.emails.length === 0) risk += 0.3
      else if (data.emails.some((email: string) => email.includes('gmail') || email.includes('yahoo'))) {
        risk += 0.2 // Personal emails are higher risk
      }
      
      // Company analysis
      if (!data.company) risk += 0.2
      
      return Math.min(risk, 0.9) // Cap at 90% risk
    }

    // AI LTV Prediction
    const predictLTV = (data: any, riskScore: number) => {
      const baseValue = 25000
      const riskMultiplier = 1 - riskScore
      const companyMultiplier = data.company ? 1.5 : 1.0
      
      return baseValue * riskMultiplier * companyMultiplier
    }

    const riskScore = calculateRiskScore(validatedData)
    const ltvPrediction = predictLTV(validatedData, riskScore)

    const client = await prisma.client.create({
      data: {
        workspace_id,
        ...validatedData,
        risk_score: riskScore,
        ltv_prediction: ltvPrediction
      }
    })

    // Log AI activity
    await prisma.aILog.create({
      data: {
        agent: 'ashley',
        function_name: 'client_risk_assessment',
        input_data: { client_data: validatedData },
        output_data: { 
          risk_score: riskScore, 
          ltv_prediction: ltvPrediction,
          factors: ['email_domain', 'company_presence']
        },
        confidence: 0.75,
        model_version: 'ashley-v2.1'
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        workspace_id,
        entity_type: 'client',
        entity_id: client.id,
        action: 'CREATE',
        after_data: client,
        metadata: {
          ai_enhanced: true,
          risk_assessed: true
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        ...client,
        ai_insights: {
          risk_assessment: {
            score: riskScore,
            level: riskScore < 0.3 ? 'LOW' : riskScore < 0.6 ? 'MEDIUM' : 'HIGH',
            factors: ['email_analysis', 'company_verification']
          },
          ltv_prediction: ltvPrediction
        }
      }
    }, { status: 201 })

  } catch (_error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Client creation error:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to create client' },
      { status: 500 }
    )
  }
}