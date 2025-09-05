import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'

// GET /api/brands - Fetch all active brands
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const brands = await prisma.brand.findMany({
      where: {
        active: true
      },
      orderBy: {
        name: 'asc'
      },
      include: {
        _count: {
          select: {
            orders: true,
            inventory: true
          }
        }
      }
    })

    return NextResponse.json({
      brands
    })

  } catch (error) {
    console.error('Error fetching brands:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/brands - Create new brand (admin/manager only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins and managers can create brands
    if (session.user.role !== Role.ADMIN && session.user.role !== Role.MANAGER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, code } = body

    // Validate required fields
    if (!name || !code) {
      return NextResponse.json(
        { error: 'Name and code are required' },
        { status: 400 }
      )
    }

    // Check if brand with same name or code already exists
    const existing = await prisma.brand.findFirst({
      where: {
        OR: [
          { name: name },
          { code: code }
        ]
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Brand with this name or code already exists' },
        { status: 409 }
      )
    }

    const brand = await prisma.brand.create({
      data: {
        name,
        code: code.toUpperCase(),
        active: true
      }
    })

    return NextResponse.json({
      message: 'Brand created successfully',
      brand
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating brand:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}