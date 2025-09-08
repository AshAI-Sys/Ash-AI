import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

// POST /api/qc/inspections/[inspectionId]/defect - Log defect in inspection
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ inspectionId: string }> }
) {
  try {
    const { inspectionId } = await params
    const session = await getServerSession()
    if (!session?.user || !['ADMIN', 'MANAGER', 'QC_INSPECTOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    const body = await request.json()
    const { 
      sampleId, 
      defectCodeId, 
      severity, 
      qty = 1, 
      photoUrl, 
      notes, 
      costAttribution,
      location,
      measurements
    } = body

    // Validate required fields
    if (!defectCodeId || !severity) {
      return NextResponse.json({ 
        error: 'Missing required fields: defectCodeId, severity' 
      }, { status: 400 })
    }

    // Verify inspection exists and is not closed
    const inspection = await prisma.qCInspection.findUnique({
      where: { id: inspectionId },
      include: {
        order: { select: { orderNumber: true } },
        _count: { select: { defects: true } }
      }
    })

    if (!inspection) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 })
    }

    if (inspection.status === 'CLOSED') {
      return NextResponse.json({ 
        error: 'Cannot add defects to closed inspection' 
      }, { status: 400 })
    }

    // Authorization check
    if (inspection.createdBy !== session.user.id && 
        !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ 
        error: 'You can only add defects to your own inspections' 
      }, { status: 403 })
    }

    // Verify sample exists if sampleId provided
    if (sampleId) {
      const sample = await prisma.qCSample.findUnique({
        where: { id: sampleId },
        select: { id: true, inspectionId: true }
      })

      if (!sample || sample.inspectionId !== inspectionId) {
        return NextResponse.json({ 
          error: 'Sample not found or does not belong to this inspection' 
        }, { status: 404 })
      }
    }

    // Verify defect code exists
    const defectCode = await prisma.qCDefectCode.findUnique({
      where: { id: defectCodeId },
      select: { id: true, code: true, description: true, severity: true }
    })

    if (!defectCode) {
      return NextResponse.json({ 
        error: 'Defect code not found' 
      }, { status: 404 })
    }

    // Create the defect
    const defect = await prisma.qCDefect.create({
      data: {
        inspectionId,
        sampleId,
        defectCodeId,
        severity: severity as any,
        qty,
        photoUrl,
        notes,
        costAttribution,
        location,
        measurements: measurements || {}
      },
      include: {
        defectCode: {
          select: {
            code: true,
            description: true
          }
        },
        sample: {
          select: {
            sampledFrom: true,
            unitRef: true
          }
        }
      }
    })

    // Update inspection's actual defect count
    const newDefectCount = inspection._count.defects + qty
    await prisma.qCInspection.update({
      where: { id: inspectionId },
      data: { 
        actualDefects: newDefectCount,
        status: 'IN_PROGRESS' // Ensure status is in progress when defects are found
      }
    })

    // Mark sample as having defects if sampleId provided
    if (sampleId) {
      await prisma.qCSample.update({
        where: { id: sampleId },
        data: { result: 'DEFECT' }
      })
    }

    // Auto-evaluation based on AQL if we have enough samples
    const samplesCount = await prisma.qCSample.count({
      where: { inspectionId }
    })

    let autoDisposition = null
    if (samplesCount >= inspection.sampleSize) {
      if (newDefectCount >= inspection.rejection) {
        autoDisposition = 'FAILED'
        await prisma.qCInspection.update({
          where: { id: inspectionId },
          data: { 
            status: 'FAILED',
            disposition: 'FAILED',
            holdShipment: true // Auto-hold shipment on failure
          }
        })
      } else if (newDefectCount <= inspection.acceptance) {
        autoDisposition = 'PASSED'
        await prisma.qCInspection.update({
          where: { id: inspectionId },
          data: { 
            status: 'PASSED',
            disposition: 'PASSED'
          }
        })
      }
    }

    // Create Ashley AI insight for critical defects
    if (severity === 'CRITICAL') {
      await prisma.aIInsight.create({
        data: {
          type: 'ANOMALY',
          priority: 'HIGH',
          title: `Critical QC Defect Detected`,
          message: `Critical defect "${defectCode.code}" found in ${inspection.stage} QC for order ${inspection.order.orderNumber}. Immediate action required.`,
          entityType: 'qc_inspection',
          entityId: inspectionId,
          actionRequired: true,
          metadata: {
            defectCode: defectCode.code,
            severity,
            stage: inspection.stage,
            orderNumber: inspection.order.orderNumber,
            qty
          }
        }
      })
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'LOG_QC_DEFECT',
        entityType: 'QCDefect',
        entityId: defect.id,
        details: `Logged ${severity} defect in QC inspection for ${inspection.order.orderNumber}`,
        metadata: {
          inspectionId,
          defectCode: defectCode.code,
          severity,
          qty,
          totalDefects: newDefectCount,
          acceptance: inspection.acceptance,
          rejection: inspection.rejection,
          autoDisposition
        }
      }
    })

    // Generate tracking update for failed inspections
    if (autoDisposition === 'FAILED') {
      await prisma.trackingUpdate.create({
        data: {
          orderId: inspection.orderId,
          stage: 'Quality Control',
          status: 'FAILED',
          message: `QC inspection FAILED - ${inspection.stage} stage. ${newDefectCount} defects found (limit: ${inspection.acceptance}). Shipment on hold.`,
          operator: session.user.name || 'QC Inspector',
          timestamp: new Date()
        }
      })

      // Auto-create CAPA task for failed inspections
      await prisma.cAPATask.create({
        data: {
          workspaceId: 'default',
          orderId: inspection.orderId,
          sourceInspectionId: inspectionId,
          title: `QC Failure Investigation - ${inspection.order.orderNumber}`,
          description: `Investigate root cause of QC failure in ${inspection.stage} stage. ${newDefectCount} defects found exceeding acceptance limit of ${inspection.acceptance}.`,
          rootCause: `Critical/Major defects: ${defectCode.code} - ${defectCode.description}`,
          ownerId: inspection.createdBy, // Assign to original inspector
          priority: severity === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          createdBy: session.user.id
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Defect logged successfully',
      defect: {
        id: defect.id,
        defectCode: defectCode.code,
        severity,
        qty,
        totalDefects: newDefectCount,
        acceptance: inspection.acceptance,
        rejection: inspection.rejection,
        autoDisposition,
        holdShipment: autoDisposition === 'FAILED'
      }
    }, { status: 201 })

  } catch (_error) {
    console.error('Error logging defect:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}