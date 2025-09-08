import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

// GET /api/sewing/piece-rates - Get all piece rates with filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const operation = searchParams.get('operation')
    const active = searchParams.get('active')
    const effectiveDate = searchParams.get('effectiveDate')

    const currentDate = new Date()

    const pieceRates = await prisma.pieceRate.findMany({
      where: {
        ...(operation && {
          OR: [
            { operationName: { contains: operation, mode: 'insensitive' } },
            { operation: { name: { contains: operation, mode: 'insensitive' } } }
          ]
        }),
        ...(active === 'true' && {
          effectiveFrom: { lte: currentDate },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: currentDate } }
          ]
        }),
        ...(effectiveDate && {
          effectiveFrom: { lte: new Date(effectiveDate) },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: new Date(effectiveDate) } }
          ]
        })
      },
      include: {
        operation: {
          select: {
            id: true,
            name: true,
            category: true,
            standardMinutes: true,
            status: true
          }
        },
        creator: {
          select: {
            name: true,
            role: true
          }
        }
      },
      orderBy: [
        { operationName: 'asc' },
        { effectiveFrom: 'desc' }
      ]
    })

    // Group by operation and calculate analytics
    const groupedRates = pieceRates.reduce((acc, rate) => {
      const key = rate.operationName
      if (!acc[key]) {
        acc[key] = {
          operationName: rate.operationName,
          operation: rate.operation,
          rates: [],
          currentRate: null,
          rateHistory: []
        }
      }
      
      acc[key].rates.push(rate)
      
      // Check if this is the current active rate
      const isActive = rate.effectiveFrom <= currentDate && 
                      (!rate.effectiveTo || rate.effectiveTo >= currentDate)
      
      if (isActive) {
        acc[key].currentRate = rate
      }
      
      acc[key].rateHistory.push({
        rate: rate.rate,
        effectiveFrom: rate.effectiveFrom,
        effectiveTo: rate.effectiveTo,
        createdBy: rate.creator?.name,
        createdAt: rate.createdAt
      })
      
      return acc
    }, {} as any)

    const result = Object.values(groupedRates)

    return NextResponse.json({
      pieceRates: result,
      total: result.length,
      totalRates: pieceRates.length
    })

  } catch (_error) {
    console.error('Error fetching piece rates:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST /api/sewing/piece-rates - Create new piece rate
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user || !['ADMIN', 'MANAGER', 'IE'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { operationName, rate, effectiveFrom, effectiveTo, notes } = body

    // Validate required fields
    if (!operationName || !rate || !effectiveFrom) {
      return NextResponse.json({ 
        error: 'Missing required fields: operationName, rate, effectiveFrom' 
      }, { status: 400 })
    }

    // Validate rate is positive
    if (parseFloat(rate) <= 0) {
      return NextResponse.json({ 
        error: 'Rate must be a positive number' 
      }, { status: 400 })
    }

    // Validate dates
    const fromDate = new Date(effectiveFrom)
    const toDate = effectiveTo ? new Date(effectiveTo) : null

    if (toDate && toDate <= fromDate) {
      return NextResponse.json({ 
        error: 'Effective to date must be after effective from date' 
      }, { status: 400 })
    }

    // Check if operation exists
    const operation = await prisma.sewingOperation.findFirst({
      where: { name: operationName }
    })

    if (!operation) {
      return NextResponse.json({ 
        error: 'Sewing operation not found' 
      }, { status: 404 })
    }

    // Check for overlapping rates
    const overlappingRates = await prisma.pieceRate.findMany({
      where: {
        operationName: operationName,
        effectiveFrom: { lt: toDate || new Date('2099-12-31') },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gt: fromDate } }
        ]
      }
    })

    if (overlappingRates.length > 0) {
      return NextResponse.json({ 
        error: 'Date range overlaps with existing piece rate. Please adjust dates or end the current rate first.',
        overlapping: overlappingRates.map(rate => ({
          id: rate.id,
          rate: rate.rate,
          effectiveFrom: rate.effectiveFrom,
          effectiveTo: rate.effectiveTo
        }))
      }, { status: 409 })
    }

    // Create the piece rate
    const pieceRate = await prisma.pieceRate.create({
      data: {
        operationName,
        operationId: operation.id,
        rate: parseFloat(rate),
        effectiveFrom: fromDate,
        effectiveTo: toDate,
        notes: notes?.trim(),
        createdBy: session.user.id
      },
      include: {
        operation: {
          select: { name: true, category: true }
        },
        creator: {
          select: { name: true }
        }
      }
    })

    // Update the operation's current piece rate if this is now active
    const currentDate = new Date()
    if (fromDate <= currentDate && (!toDate || toDate >= currentDate)) {
      await prisma.sewingOperation.update({
        where: { id: operation.id },
        data: { pieceRate: parseFloat(rate) }
      })
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE_PIECE_RATE',
        entityType: 'PieceRate',
        entityId: pieceRate.id,
        details: `Created piece rate for ${operationName}: $${rate}`,
        metadata: {
          operationName,
          rate: parseFloat(rate),
          effectiveFrom: fromDate,
          effectiveTo: toDate,
          createdBy: session.user.name
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Piece rate created successfully',
      pieceRate
    }, { status: 201 })

  } catch (_error) {
    console.error('Error creating piece rate:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// PUT /api/sewing/piece-rates/bulk-update - Update multiple operations' rates
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user || !['ADMIN', 'MANAGER', 'IE'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { updates, effectiveFrom, notes } = body

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ 
        error: 'Updates array is required and cannot be empty' 
      }, { status: 400 })
    }

    const fromDate = new Date(effectiveFrom || new Date())
    const results = []
    const errors = []

    // Process each update in a transaction
    await prisma.$transaction(async (tx) => {
      for (const update of updates) {
        try {
          const { operationName, rate } = update

          if (!operationName || !rate) {
            errors.push({ operationName, error: 'Missing operation name or rate' })
            continue
          }

          // Check if operation exists
          const operation = await tx.sewingOperation.findFirst({
            where: { name: operationName }
          })

          if (!operation) {
            errors.push({ operationName, error: 'Operation not found' })
            continue
          }

          // End current active rates
          await tx.pieceRate.updateMany({
            where: {
              operationName,
              effectiveFrom: { lte: fromDate },
              OR: [
                { effectiveTo: null },
                { effectiveTo: { gt: fromDate } }
              ]
            },
            data: {
              effectiveTo: new Date(new Date(fromDate).getTime() - 1)
            }
          })

          // Create new rate
          const pieceRate = await tx.pieceRate.create({
            data: {
              operationName,
              operationId: operation.id,
              rate: parseFloat(rate),
              effectiveFrom: fromDate,
              effectiveTo: null,
              notes: notes?.trim(),
              createdBy: session.user.id
            }
          })

          // Update operation's current rate
          await tx.sewingOperation.update({
            where: { id: operation.id },
            data: { pieceRate: parseFloat(rate) }
          })

          results.push({
            operationName,
            rate: parseFloat(rate),
            pieceRateId: pieceRate.id
          })

        } catch (_error) {
          errors.push({ 
            operationName: update.operationName, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          })
        }
      }
    })

    // Create audit log for bulk update
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'BULK_UPDATE_PIECE_RATES',
        entityType: 'PieceRate',
        entityId: 'bulk',
        details: `Bulk updated ${results.length} piece rates`,
        metadata: {
          successful: results,
          errors: errors,
          effectiveFrom: fromDate,
          updatedBy: session.user.name
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `Bulk update completed. ${results.length} rates updated successfully.`,
      results,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (_error) {
    console.error('Error bulk updating piece rates:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}