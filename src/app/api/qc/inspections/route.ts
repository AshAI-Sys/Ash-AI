import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// GET /api/qc/inspections - Get QC inspections with filtering and analytics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const order_id = searchParams.get('order_id')
    const stage = searchParams.get('stage')
    const status = searchParams.get('status')
    const inspector = searchParams.get('inspector')
    const includeAnalytics = searchParams.get('analytics') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const inspections = await prisma.qCInspection.findMany({
      where: {
        ...(order_id && { order_id }),
        ...(stage && { stage: stage as any }),
        ...(status && { status: status as any }),
        ...(inspector && { created_by: inspector })
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            clientName: true,
            productType: true,
            quantity: true,
            dueDate: true
          }
        },
        routingStep: {
          select: {
            name: true,
            workcenter: true
          }
        },
        checklist: {
          select: {
            name: true,
            items: true
          }
        },
        inspector: {
          select: {
            name: true,
            role: true
          }
        },
        approver: {
          select: {
            name: true
          }
        },
        samples: {
          select: {
            id: true,
            sampledFrom: true,
            unitRef: true,
            result: true
          }
        },
        defects: {
          select: {
            id: true,
            severity: true,
            qty: true,
            defectCode: {
              select: {
                code: true,
                description: true
              }
            }
          }
        },
        _count: {
          select: {
            samples: true,
            defects: true
          }
        }
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset
    })

    // Calculate analytics if requested
    let analytics = null
    if (includeAnalytics) {
      analytics = await calculateInspectionAnalytics(inspections)
    }

    return NextResponse.json({
      inspections,
      total: inspections.length,
      analytics
    })

  } catch (_error) {
    console.error('Error fetching QC inspections:', _error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST /api/qc/inspections - Create new QC inspection with AQL calculation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user || !['ADMIN', 'MANAGER', 'QC_INSPECTOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { 
      order_id, 
      routing_step_id, 
      stage, 
      lotSize, 
      aql = 2.5, 
      level = 'GII', 
      checklistId,
      notes 
    } = body

    // Validate required fields
    if (!order_id || !stage || !lotSize) {
      return NextResponse.json({ 
        error: 'Missing required fields: order_id, stage, lotSize' 
      }, { status: 400 })
    }

    // Validate order exists
    const order = await prisma.order.findUnique({
      where: { id: order_id },
      select: { id: true, orderNumber: true, status: true }
    })

    if (!order) {
      return NextResponse.json({ 
        error: 'Order not found' 
      }, { status: 404 })
    }

    // Calculate AQL sample size and acceptance/rejection numbers
    const aqlPlan = calculateAQLPlan(lotSize, aql, level)

    if (!aqlPlan) {
      return NextResponse.json({ 
        error: 'Unable to calculate AQL plan for given parameters' 
      }, { status: 400 })
    }

    // Check for existing open inspections for same order/stage
    const existingInspection = await prisma.qCInspection.findFirst({
      where: {
        order_id,
        stage: stage as any,
        status: { in: ['OPEN', 'IN_PROGRESS'] }
      }
    })

    if (existingInspection) {
      return NextResponse.json({ 
        error: 'An open inspection already exists for this order and stage',
        existingInspectionId: existingInspection.id
      }, { status: 409 })
    }

    // Create the inspection
    const inspection = await prisma.qCInspection.create({
      data: {
        order_id,
        routing_step_id,
        stage: stage as any,
        lotSize,
        aql: parseFloat(aql.toString()),
        level,
        sampleSize: aqlPlan.sampleSize,
        acceptance: aqlPlan.acceptance,
        rejection: aqlPlan.rejection,
        checklistId,
        created_by: session.user.id,
        inspectorNotes: notes
      },
      include: {
        order: {
          select: { orderNumber: true, clientName: true }
        },
        checklist: {
          select: { name: true, items: true }
        }
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        user_id: session.user.id,
        action: 'CREATE_QC_INSPECTION',
        entityType: 'QCInspection',
        entityId: inspection.id,
        details: `Created QC inspection for ${order.orderNumber} - ${stage}`,
        metadata: {
          order_id,
          stage,
          lotSize,
          aql,
          sampleSize: aqlPlan.sampleSize,
          acceptance: aqlPlan.acceptance,
          rejection: aqlPlan.rejection
        }
      }
    })

    // Generate tracking update
    await prisma.trackingUpdate.create({
      data: {
        order_id,
        stage: 'Quality Control',
        status: 'IN_PROGRESS',
        message: `QC inspection started for ${stage} stage - Sample size: ${aqlPlan.sampleSize}`,
        operator: session.user.name || 'QC Inspector',
        timestamp: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'QC inspection created successfully',
      inspection: {
        id: inspection.id,
        order_id: inspection.order_id,
        stage: inspection.stage,
        sampleSize: inspection.sampleSize,
        acceptance: inspection.acceptance,
        rejection: inspection.rejection,
        aqlPlan
      }
    }, { status: 201 })

  } catch (_error) {
    console.error('Error creating QC inspection:', _error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper function to calculate AQL sampling plan
function calculateAQLPlan(lotSize: number, aql: number, level: string = 'GII') {
  // AQL sampling plans based on MIL-STD-105E / ISO 2859
  // This is a simplified version - in production, use a complete AQL table
  
  const aqlTables = {
    'GI': { // General Inspection Level I
      ranges: [
        { min: 0, max: 15, code: 'A', sampleSize: 2 },
        { min: 16, max: 25, code: 'B', sampleSize: 3 },
        { min: 26, max: 50, code: 'C', sampleSize: 5 },
        { min: 51, max: 90, code: 'D', sampleSize: 8 },
        { min: 91, max: 150, code: 'E', sampleSize: 13 },
        { min: 151, max: 280, code: 'F', sampleSize: 20 },
        { min: 281, max: 500, code: 'G', sampleSize: 32 },
        { min: 501, max: 1200, code: 'H', sampleSize: 50 },
        { min: 1201, max: 3200, code: 'J', sampleSize: 80 },
        { min: 3201, max: 10000, code: 'K', sampleSize: 125 },
        { min: 10001, max: 35000, code: 'L', sampleSize: 200 }
      ]
    },
    'GII': { // General Inspection Level II (most common)
      ranges: [
        { min: 0, max: 8, code: 'A', sampleSize: 2 },
        { min: 9, max: 15, code: 'B', sampleSize: 3 },
        { min: 16, max: 25, code: 'C', sampleSize: 5 },
        { min: 26, max: 50, code: 'D', sampleSize: 8 },
        { min: 51, max: 90, code: 'E', sampleSize: 13 },
        { min: 91, max: 150, code: 'F', sampleSize: 20 },
        { min: 151, max: 280, code: 'G', sampleSize: 32 },
        { min: 281, max: 500, code: 'H', sampleSize: 50 },
        { min: 501, max: 1200, code: 'J', sampleSize: 80 },
        { min: 1201, max: 3200, code: 'K', sampleSize: 125 },
        { min: 3201, max: 10000, code: 'L', sampleSize: 200 },
        { min: 10001, max: 35000, code: 'M', sampleSize: 315 }
      ]
    }
  }

  const levelTable = aqlTables[level as keyof typeof aqlTables] || aqlTables['GII']
  const range = levelTable.ranges.find(r => lotSize >= r.min && lotSize <= r.max)
  
  if (!range) {
    return null
  }

  // Acceptance and rejection numbers based on AQL and sample size
  // Simplified calculation - in production, use complete AQL tables
  const aqlAcceptanceMap: { [key: string]: { [key: number]: { ac: number, re: number } } } = {
    '0.1': { 2: {ac: 0, re: 1}, 3: {ac: 0, re: 1}, 5: {ac: 0, re: 1}, 8: {ac: 0, re: 1}, 13: {ac: 0, re: 1} },
    '0.15': { 2: {ac: 0, re: 1}, 3: {ac: 0, re: 1}, 5: {ac: 0, re: 1}, 8: {ac: 0, re: 1}, 13: {ac: 0, re: 1} },
    '0.25': { 2: {ac: 0, re: 1}, 3: {ac: 0, re: 1}, 5: {ac: 0, re: 1}, 8: {ac: 0, re: 1}, 13: {ac: 0, re: 1} },
    '0.4': { 2: {ac: 0, re: 1}, 3: {ac: 0, re: 1}, 5: {ac: 0, re: 1}, 8: {ac: 0, re: 1}, 13: {ac: 0, re: 1} },
    '0.65': { 2: {ac: 0, re: 1}, 3: {ac: 0, re: 1}, 5: {ac: 0, re: 1}, 8: {ac: 0, re: 1}, 13: {ac: 0, re: 1} },
    '1.0': { 2: {ac: 0, re: 1}, 3: {ac: 0, re: 1}, 5: {ac: 0, re: 1}, 8: {ac: 0, re: 1}, 13: {ac: 0, re: 1}, 20: {ac: 0, re: 1} },
    '1.5': { 2: {ac: 0, re: 1}, 3: {ac: 0, re: 1}, 5: {ac: 0, re: 1}, 8: {ac: 0, re: 1}, 13: {ac: 0, re: 1}, 20: {ac: 0, re: 1}, 32: {ac: 1, re: 2} },
    '2.5': { 2: {ac: 0, re: 1}, 3: {ac: 0, re: 1}, 5: {ac: 0, re: 1}, 8: {ac: 0, re: 1}, 13: {ac: 1, re: 2}, 20: {ac: 1, re: 2}, 32: {ac: 2, re: 3}, 50: {ac: 3, re: 4}, 80: {ac: 5, re: 6} },
    '4.0': { 5: {ac: 0, re: 1}, 8: {ac: 0, re: 1}, 13: {ac: 1, re: 2}, 20: {ac: 2, re: 3}, 32: {ac: 3, re: 4}, 50: {ac: 5, re: 6}, 80: {ac: 7, re: 8}, 125: {ac: 10, re: 11} },
    '6.5': { 8: {ac: 1, re: 2}, 13: {ac: 2, re: 3}, 20: {ac: 3, re: 4}, 32: {ac: 5, re: 6}, 50: {ac: 7, re: 8}, 80: {ac: 10, re: 11}, 125: {ac: 14, re: 15}, 200: {ac: 21, re: 22} }
  }

  const aqlStr = aql.toString()
  const aqlData = aqlAcceptanceMap[aqlStr]
  
  if (!aqlData || !aqlData[range.sampleSize]) {
    // Default fallback calculation
    const acceptance = Math.floor(range.sampleSize * aql / 100)
    const rejection = acceptance + 1
    
    return {
      lotSize,
      aql,
      level,
      sampleSize: range.sampleSize,
      acceptance,
      rejection,
      code: range.code
    }
  }

  const { ac, re } = aqlData[range.sampleSize]
  
  return {
    lotSize,
    aql,
    level,
    sampleSize: range.sampleSize,
    acceptance: ac,
    rejection: re,
    code: range.code
  }
}

// Helper function to calculate inspection analytics
async function calculateInspectionAnalytics(inspections: any[]) {
  if (inspections.length === 0) {
    return {
      totalInspections: 0,
      passRate: 0,
      defectRate: 0,
      avgDefectsPerInspection: 0
    }
  }

  const totalInspections = inspections.length
  const passedInspections = inspections.filter(i => i.status === 'PASSED').length
  const failedInspections = inspections.filter(i => i.status === 'FAILED').length
  const totalDefects = inspections.reduce((sum, i) => sum + i._count.defects, 0)
  const totalSamples = inspections.reduce((sum, i) => sum + i._count.samples, 0)

  return {
    totalInspections,
    passedInspections,
    failedInspections,
    passRate: totalInspections > 0 ? Math.round((passedInspections / totalInspections) * 100) : 0,
    defectRate: totalSamples > 0 ? Math.round((totalDefects / totalSamples) * 1000) / 10 : 0,
    avgDefectsPerInspection: totalInspections > 0 ? Math.round((totalDefects / totalInspections) * 10) / 10 : 0,
    criticalDefects: inspections.reduce((sum, i) => 
      sum + i.defects.filter((d: any) => d.severity === 'CRITICAL').length, 0),
    majorDefects: inspections.reduce((sum, i) => 
      sum + i.defects.filter((d: any) => d.severity === 'MAJOR').length, 0),
    minorDefects: inspections.reduce((sum, i) => 
      sum + i.defects.filter((d: any) => d.severity === 'MINOR').length, 0)
  }
}