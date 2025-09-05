import { NextRequest, NextResponse } from 'next/server'
import { db, createAuditLog } from '@/lib/db'
import { Prisma } from '@prisma/client'

// GET /api/ash/clients - Fetch clients based on CLIENT_UPDATED_PLAN.md
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspace_id = searchParams.get('workspace_id')
    
    if (!workspace_id) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      )
    }

    const clients = await db.client.findMany({
      where: {
        workspace_id
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
          orderBy: {
            created_at: 'desc'
          },
          take: 5
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      clients
    })

  } catch (error) {
    console.error('Error fetching clients:', error)
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    )
  }
}

// POST /api/ash/clients - Create new client based on CLIENT_UPDATED_PLAN.md
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      workspace_id,
      name,
      company,
      emails,
      phones,
      billing_address,
      notes
    } = body

    // Validate required fields per CLIENT_UPDATED_PLAN.md
    if (!workspace_id || !name) {
      return NextResponse.json(
        { error: 'workspace_id and name are required' },
        { status: 400 }
      )
    }

    // Validate workspace exists
    const workspace = await db.workspace.findUnique({
      where: { id: workspace_id }
    })

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      )
    }

    // Create client per CLIENT_UPDATED_PLAN.md schema
    const client = await db.client.create({
      data: {
        workspace_id,
        name: name.trim(),
        company: company?.trim() || null,
        emails: emails || [],
        phones: phones || [],
        billing_address: billing_address || null,
        notes: notes?.trim() || null
      }
    })

    // Create audit log per CLIENT_UPDATED_PLAN.md
    await createAuditLog({
      workspace_id,
      entity_type: 'client',
      entity_id: client.id,
      action: 'CREATE',
      after_data: {
        name: client.name,
        company: client.company,
        emails: client.emails,
        phones: client.phones
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Client created successfully',
      client
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating client:', error)
    return NextResponse.json(
      { error: 'Failed to create client' },
      { status: 500 }
    )
  }
}

