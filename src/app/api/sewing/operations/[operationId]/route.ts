// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// GET /api/sewing/operations/[operationId] - Get specific operation details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ operationId: string }> }
) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { operationId } = await params
    const { searchParams } = new URL(request.url)
    const includeHistory = searchParams.get('history') === 'true'
    const includePieceRates = searchParams.get('rates') === 'true'

    const operation = await prisma.sewingOperation.findUnique({
      where: { id: operationId },
      include: {
        _count: {
          select: {
            runs: true
          }
        },
        ...(includeHistory && {
          runs: {
            select: {
              id: true,
              operatorId: true,
              bundleId: true,
              qtyGood: true,
              qtyDefects: true,
              qtyRejects: true,
              efficiency: true,
              actualMinutes: true,
              startedAt: true,
              endedAt: true,
              status: true,
              operator: {
                select: { name: true }
              },
              bundle: {
                select: { bundleNumber: true }
              },
              order: {
                select: { orderNumber: true }
              }
            },
            orderBy: { created_at: 'desc' },
            take: 50
          }
        }),
        ...(includePieceRates && {
          pieceRates: {
            select: {
              id: true,
              rate: true,
              effectiveFrom: true,
              effectiveTo: true,
              created_by: true,
              created_at: true,
              creator: {
                select: { name: true }
              }
            },
            orderBy: { effectiveFrom: 'desc' }
          }
        })
      }
    })

    if (!operation) {
      return NextResponse.json({ error: 'Operation not found' }, { status: 404 })
    }

    // Calculate detailed analytics if history is requested
    let analytics = null
    if (includeHistory && operation.runs) {
      analytics = calculateDetailedAnalytics(operation.runs)
    }

    return NextResponse.json({
      operation: {
        ...operation,
        analytics
      }
    })

  } catch (_error) {
    console.error('Error fetching sewing operation:', _error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// PUT /api/sewing/operations/[operationId] - Update sewing operation
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ operationId: string }> }
) {
  try {
    const session = await getServerSession()
    if (!session?.user || !['ADMIN', 'MANAGER', 'IE'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { operationId } = await params
    const body = await request.json()
    const { name, description, category, standardMinutes, difficulty, skillLevel, tools, setup, status } = body

    // Check if operation exists
    const existingOperation = await prisma.sewingOperation.findUnique({
      where: { id: operationId }
    })

    if (!existingOperation) {
      return NextResponse.json({ error: 'Operation not found' }, { status: 404 })
    }

    // Check for name conflicts if name is being changed
    if (name && name !== existingOperation.name) {
      const duplicateCheck = await prisma.sewingOperation.findFirst({
        where: { 
          name: { equals: name, mode: 'insensitive' },
          id: { not: operationId }
        }
      })

      if (duplicateCheck) {
        return NextResponse.json({ 
          error: 'Operation with this name already exists' 
        }, { status: 409 })
      }
    }

    // Update operation
    const updatedOperation = await prisma.sewingOperation.update({
      where: { id: operationId },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() }),
        ...(category && { category }),
        ...(standardMinutes && { standardMinutes: parseFloat(standardMinutes) }),
        ...(difficulty && { difficulty }),
        ...(skillLevel && { skillLevel }),
        ...(tools && { tools }),
        ...(setup && { setup }),
        ...(status && { status })
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        user_id: session.user.id,
        action: 'UPDATE_SEWING_OPERATION',
        entityType: 'SewingOperation',
        entityId: operationId,
        details: `Updated sewing operation: ${updatedOperation.name}`,
        metadata: {
          operationName: updatedOperation.name,
          changes: body,
          updatedBy: session.user.name
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Sewing operation updated successfully',
      operation: updatedOperation
    })

  } catch (_error) {
    console.error('Error updating sewing operation:', _error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE /api/sewing/operations/[operationId] - Soft delete sewing operation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ operationId: string }> }
) {
  try {
    const session = await getServerSession()
    if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { operationId } = await params

    // Check if operation exists and has active runs
    const operation = await prisma.sewingOperation.findUnique({
      where: { id: operationId },
      include: {
        _count: {
          select: {
            runs: {
              where: { status: { in: ['CREATED', 'IN_PROGRESS'] } }
            }
          }
        }
      }
    })

    if (!operation) {
      return NextResponse.json({ error: 'Operation not found' }, { status: 404 })
    }

    if (operation._count.runs > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete operation with active runs. Complete or cancel active runs first.' 
      }, { status: 400 })
    }

    // Soft delete by updating status
    const deletedOperation = await prisma.sewingOperation.update({
      where: { id: operationId },
      data: { status: 'INACTIVE' }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        user_id: session.user.id,
        action: 'DELETE_SEWING_OPERATION',
        entityType: 'SewingOperation',
        entityId: operationId,
        details: `Deactivated sewing operation: ${operation.name}`,
        metadata: {
          operationName: operation.name,
          deletedBy: session.user.name
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Sewing operation deactivated successfully'
    })

  } catch (_error) {
    console.error('Error deleting sewing operation:', _error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper function for detailed analytics
function calculateDetailedAnalytics(runs: any[]) {
  if (runs.length === 0) return null

  const completedRuns = runs.filter(run => run.status === 'COMPLETED')
  
  if (completedRuns.length === 0) return null

  // Time-based analytics
  const last7Days = completedRuns.filter(run => 
    run.endedAt && new Date(run.endedAt) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  )
  const last30Days = completedRuns.filter(run => 
    run.endedAt && new Date(run.endedAt) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  )

  // Efficiency analytics
  const efficiencyData = completedRuns.filter(run => run.efficiency !== null)
  const avgEfficiency = efficiencyData.length > 0 
    ? efficiencyData.reduce((sum, run) => sum + run.efficiency, 0) / efficiencyData.length
    : null

  // Quality analytics
  const totalGood = completedRuns.reduce((sum, run) => sum + (run.qtyGood || 0), 0)
  const totalDefects = completedRuns.reduce((sum, run) => sum + (run.qtyDefects || 0), 0)
  const totalRejects = completedRuns.reduce((sum, run) => sum + (run.qtyRejects || 0), 0)
  const totalPieces = totalGood + totalDefects + totalRejects

  // Operator performance
  const operatorStats = completedRuns.reduce((acc, run) => {
    if (!run.operator?.name) return acc
    
    const operatorName = run.operator.name
    if (!acc[operatorName]) {
      acc[operatorName] = { runs: 0, totalEfficiency: 0, totalPieces: 0 }
    }
    
    acc[operatorName].runs++
    acc[operatorName].totalEfficiency += run.efficiency || 0
    acc[operatorName].totalPieces += run.qtyGood || 0
    
    return acc
  }, {} as any)

  const topPerformers = Object.entries(operatorStats)
    .map(([name, stats]: [string, any]) => ({
      name,
      avgEfficiency: stats.runs > 0 ? Math.round((stats.totalEfficiency / stats.runs) * 10) / 10 : 0,
      totalPieces: stats.totalPieces,
      totalRuns: stats.runs
    }))
    .sort((a, b) => b.avgEfficiency - a.avgEfficiency)
    .slice(0, 5)

  return {
    overview: {
      totalRuns: completedRuns.length,
      last7DaysRuns: last7Days.length,
      last30DaysRuns: last30Days.length,
      avgEfficiency: avgEfficiency ? Math.round(avgEfficiency * 10) / 10 : null,
      qualityRate: totalPieces > 0 ? Math.round(((totalGood) / totalPieces) * 1000) / 10 : null,
      defectRate: totalPieces > 0 ? Math.round((totalDefects / totalPieces) * 1000) / 10 : null,
      rejectRate: totalPieces > 0 ? Math.round((totalRejects / totalPieces) * 1000) / 10 : null
    },
    production: {
      totalPieces,
      totalGood,
      totalDefects,
      totalRejects,
      avgPiecesPerRun: completedRuns.length > 0 ? Math.round(totalPieces / completedRuns.length) : 0
    },
    operators: {
      uniqueOperators: Object.keys(operatorStats).length,
      topPerformers
    }
  }
}