import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

// POST /api/qc/inspections/[inspectionId]/sample - Add sample to inspection
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
    const { sampledFrom, unitRef, checkResults } = body

    // Verify inspection exists and is open
    const inspection = await prisma.qCInspection.findUnique({
      where: { id: inspectionId },
      include: {
        _count: { select: { samples: true } },
        order: { select: { orderNumber: true } }
      }
    })

    if (!inspection) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 })
    }

    if (inspection.status === 'CLOSED') {
      return NextResponse.json({ 
        error: 'Cannot add samples to closed inspection' 
      }, { status: 400 })
    }

    // Check if sample size limit reached
    if (inspection._count.samples >= inspection.sampleSize) {
      return NextResponse.json({ 
        error: `Sample size limit reached (${inspection.sampleSize} samples)` 
      }, { status: 400 })
    }

    // Authorization check
    if (inspection.createdBy !== session.user.id && 
        !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ 
        error: 'You can only add samples to your own inspections' 
      }, { status: 403 })
    }

    // Create the sample
    const sample = await prisma.qCSample.create({
      data: {
        inspectionId,
        sampledFrom,
        unitRef,
        checkResults: checkResults || {}
      }
    })

    // Update inspection status to IN_PROGRESS if it's the first sample
    if (inspection._count.samples === 0 && inspection.status === 'OPEN') {
      await prisma.qCInspection.update({
        where: { id: inspectionId },
        data: { status: 'IN_PROGRESS' }
      })
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'ADD_QC_SAMPLE',
        entityType: 'QCSample',
        entityId: sample.id,
        details: `Added sample to QC inspection for ${inspection.order.orderNumber}`,
        metadata: {
          inspectionId,
          sampledFrom,
          unitRef,
          sampleNumber: inspection._count.samples + 1,
          totalSamples: inspection.sampleSize
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Sample added successfully',
      sample: {
        id: sample.id,
        sampledFrom: sample.sampledFrom,
        unitRef: sample.unitRef,
        sampleNumber: inspection._count.samples + 1,
        totalSamples: inspection.sampleSize,
        remaining: inspection.sampleSize - inspection._count.samples - 1
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error adding sample:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}