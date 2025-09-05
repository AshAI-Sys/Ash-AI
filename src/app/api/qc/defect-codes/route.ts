import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

// GET /api/qc/defect-codes - Get defect codes with filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const method = searchParams.get('method')
    const severity = searchParams.get('severity')
    const active = searchParams.get('active')
    const search = searchParams.get('search')

    const defectCodes = await prisma.qCDefectCode.findMany({
      where: {
        workspaceId: 'default', // TODO: Get from session
        ...(method && { method }),
        ...(severity && { severity: severity as any }),
        ...(active !== null && { isActive: active === 'true' }),
        ...(search && {
          OR: [
            { code: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        })
      },
      include: {
        _count: {
          select: {
            defects: {
              where: {
                createdAt: {
                  gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
                }
              }
            }
          }
        }
      },
      orderBy: [
        { severity: 'asc' }, // CRITICAL first
        { code: 'asc' }
      ]
    })

    // Group by severity for easier UI consumption
    const groupedCodes = defectCodes.reduce((acc, code) => {
      if (!acc[code.severity]) {
        acc[code.severity] = []
      }
      acc[code.severity].push({
        ...code,
        usageCount: code._count.defects
      })
      return acc
    }, {} as any)

    return NextResponse.json({
      defectCodes: defectCodes.map(code => ({
        ...code,
        usageCount: code._count.defects
      })),
      groupedBySeverity: groupedCodes,
      total: defectCodes.length
    })

  } catch (error) {
    console.error('Error fetching defect codes:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST /api/qc/defect-codes - Create new defect code
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { code, severity, method, description } = body

    // Validate required fields
    if (!code || !severity) {
      return NextResponse.json({ 
        error: 'Missing required fields: code, severity' 
      }, { status: 400 })
    }

    // Check for duplicate codes
    const existingCode = await prisma.qCDefectCode.findFirst({
      where: {
        workspaceId: 'default',
        code: { equals: code.toUpperCase(), mode: 'insensitive' }
      }
    })

    if (existingCode) {
      return NextResponse.json({ 
        error: 'Defect code already exists' 
      }, { status: 409 })
    }

    const defectCode = await prisma.qCDefectCode.create({
      data: {
        workspaceId: 'default',
        code: code.toUpperCase(),
        severity: severity as any,
        method,
        description
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE_QC_DEFECT_CODE',
        entityType: 'QCDefectCode',
        entityId: defectCode.id,
        details: `Created defect code: ${defectCode.code} (${severity})`,
        metadata: {
          code: defectCode.code,
          severity,
          method,
          description
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Defect code created successfully',
      defectCode
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating defect code:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}