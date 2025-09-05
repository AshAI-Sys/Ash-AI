import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

// GET /api/routing-templates - Get all routing templates
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const method = searchParams.get('method')

    // Build where clause
    const where = method ? { method } : {}

    const templates = await prisma.routingTemplate.findMany({
      where,
      orderBy: [
        { method: 'asc' },
        { isDefault: 'desc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json({ templates })

  } catch (error) {
    console.error('Error fetching routing templates:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// POST /api/routing-templates - Create new routing template
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate required fields
    const requiredFields = ['name', 'key', 'method', 'steps']
    const missingFields = requiredFields.filter(field => !body[field])
    
    if (missingFields.length > 0) {
      return NextResponse.json({ 
        error: 'Missing required fields', 
        fields: missingFields 
      }, { status: 400 })
    }

    // Check if templateKey already exists
    const existingTemplate = await prisma.routingTemplate.findUnique({
      where: { templateKey: body.key }
    })

    if (existingTemplate) {
      return NextResponse.json({ 
        error: 'Template key already exists' 
      }, { status: 409 })
    }

    // Create template using the existing schema
    const template = await prisma.routingTemplate.create({
      data: {
        name: body.name,
        templateKey: body.key,
        method: body.method,
        isDefault: body.isDefault || false,
        active: body.isActive !== false,
        steps: body.steps // Store steps as JSON
      }
    })

    return NextResponse.json({ 
      success: true,
      template,
      message: `Routing template "${template.name}" created successfully` 
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating routing template:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}