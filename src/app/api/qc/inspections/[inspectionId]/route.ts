import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

// GET /api/qc/inspections/[inspectionId] - Get inspection details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ inspectionId: string }> }
) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { inspectionId } = await params

    const inspection = await prisma.qCInspection.findUnique({
      where: { id: inspectionId },
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
        checklist: true,
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
          include: {
            defects: {
              include: {
                defectCode: {
                  select: {
                    code: true,
                    description: true,
                    severity: true
                  }
                }
              }
            }
          }
        },
        defects: {
          include: {
            defectCode: {
              select: {
                code: true,
                description: true,
                severity: true
              }
            },
            sample: {
              select: {
                sampledFrom: true,
                unitRef: true
              }
            }
          }
        },
        capaTasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            owner: {
              select: { name: true }
            }
          }
        }
      }
    })

    if (!inspection) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 })
    }

    return NextResponse.json({ inspection })

  } catch (_error) {
    console.error('Error fetching inspection:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// PUT /api/qc/inspections/[inspectionId] - Update inspection
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ inspectionId: string }> }
) {
  try {
    const session = await getServerSession()
    if (!session?.user || !['ADMIN', 'MANAGER', 'QC_INSPECTOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { inspectionId } = await params
    const body = await request.json()
    const { status, disposition, inspectorNotes, managerNotes, holdShipment } = body

    const inspection = await prisma.qCInspection.findUnique({
      where: { id: inspectionId },
      include: {
        order: { select: { orderNumber: true } },
        defects: true
      }
    })

    if (!inspection) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 })
    }

    // Authorization check - only inspector or manager can update
    if (inspection.createdBy !== session.user.id && 
        !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ 
        error: 'You can only update your own inspections' 
      }, { status: 403 })
    }

    // Validate status transitions
    const validTransitions = {
      'OPEN': ['IN_PROGRESS', 'CLOSED'],
      'IN_PROGRESS': ['PASSED', 'FAILED', 'CLOSED'],
      'PASSED': ['CLOSED'],
      'FAILED': ['IN_PROGRESS', 'CLOSED']
    }

    if (status && !validTransitions[inspection.status as keyof typeof validTransitions]?.includes(status)) {
      return NextResponse.json({ 
        error: `Invalid status transition from ${inspection.status} to ${status}` 
      }, { status: 400 })
    }

    const updatedInspection = await prisma.qCInspection.update({
      where: { id: inspectionId },
      data: {
        ...(status && { status: status as any }),
        ...(disposition && { disposition }),
        ...(inspectorNotes !== undefined && { inspectorNotes }),
        ...(managerNotes !== undefined && { managerNotes }),
        ...(holdShipment !== undefined && { holdShipment }),
        ...(status === 'CLOSED' && { closedAt: new Date() }),
        ...((['PASSED', 'FAILED'].includes(status)) && { 
          approvedBy: session.user.id,
          closedAt: new Date()
        })
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE_QC_INSPECTION',
        entityType: 'QCInspection',
        entityId: inspectionId,
        details: `Updated QC inspection for ${inspection.order.orderNumber}`,
        metadata: {
          oldStatus: inspection.status,
          newStatus: status || inspection.status,
          disposition,
          holdShipment: holdShipment || false
        }
      }
    })

    // Update tracking if status changed
    if (status) {
      await prisma.trackingUpdate.create({
        data: {
          orderId: inspection.orderId,
          stage: 'Quality Control',
          status: status === 'PASSED' ? 'COMPLETED' : status === 'FAILED' ? 'FAILED' : 'IN_PROGRESS',
          message: `QC inspection ${status.toLowerCase()} - ${inspection.stage} stage`,
          operator: session.user.name || 'QC Inspector',
          timestamp: new Date()
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Inspection updated successfully',
      inspection: updatedInspection
    })

  } catch (_error) {
    console.error('Error updating inspection:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}