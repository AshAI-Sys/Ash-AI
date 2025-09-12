// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// POST /api/qc/inspections/[inspectionId]/close - Close QC inspection with final disposition
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
    const { disposition, managerNotes, createRework, createCAPA, waiver } = body

    // Validate required fields
    if (!disposition || !['PASSED', 'FAILED'].includes(disposition)) {
      return NextResponse.json({ 
        error: 'Invalid disposition. Must be PASSED or FAILED' 
      }, { status: 400 })
    }

    // Get inspection with full details
    const inspection = await prisma.qCInspection.findUnique({
      where: { id: inspectionId },
      include: {
        order: {
          select: { 
            id: true,
            orderNumber: true, 
            clientName: true,
            status: true,
            routing_steps: {
              where: { workcenter: 'PACKING' },
              select: { id: true, status: true }
            }
          }
        },
        samples: {
          include: {
            defects: {
              include: {
                defectCode: true
              }
            }
          }
        },
        defects: {
          include: {
            defectCode: true
          }
        },
        _count: {
          select: {
            samples: true,
            defects: true
          }
        }
      }
    })

    if (!inspection) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 })
    }

    if (inspection.status === 'CLOSED') {
      return NextResponse.json({ 
        error: 'Inspection already closed' 
      }, { status: 400 })
    }

    // Authorization - managers can close any inspection, inspectors only their own
    if (!['ADMIN', 'MANAGER'].includes(session.user.role) && 
        inspection.createdBy !== session.user.id) {
      return NextResponse.json({ 
        error: 'You can only close your own inspections' 
      }, { status: 403 })
    }

    // Validate AQL compliance if not using manager override
    const actualDefects = inspection.actualDefects
    let aqlCompliant = true
    let aqlMessage = ''

    if (disposition === 'PASSED' && actualDefects > inspection.acceptance) {
      aqlCompliant = false
      aqlMessage = `AQL violation: ${actualDefects} defects exceed acceptance limit of ${inspection.acceptance}`
      
      // Only managers can override AQL
      if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
        return NextResponse.json({ 
          error: aqlMessage + '. Manager approval required for override.' 
        }, { status: 400 })
      }
    }

    if (disposition === 'FAILED' && actualDefects < inspection.rejection) {
      aqlCompliant = false
      aqlMessage = `AQL note: ${actualDefects} defects below rejection limit of ${inspection.rejection}`
    }

    // Start transaction for complex updates
    const result = await prisma.$transaction(async (tx) => {
      // Close the inspection
      const closedInspection = await tx.qCInspection.update({
        where: { id: inspectionId },
        data: {
          status: 'CLOSED',
          disposition,
          managerNotes,
          approvedBy: session.user.id,
          closedAt: new Date(),
          holdShipment: disposition === 'FAILED' && !waiver
        }
      })

      // Create rework order if requested and inspection failed
      let reworkOrder = null
      if (createRework && disposition === 'FAILED') {
        // Create rework tasks based on defects found
        const criticalDefects = inspection.defects.filter(d => d.severity === 'CRITICAL')
        const majorDefects = inspection.defects.filter(d => d.severity === 'MAJOR')

        if (criticalDefects.length > 0 || majorDefects.length > 0) {
          const reworkTasks = [...criticalDefects, ...majorDefects].map(defect => ({
            order_id: inspection.order_id,
            taskType: 'REWORK',
            description: `Rework: ${defect.defectCode.description} (${defect.defectCode.code})`,
            priority: defect.severity === 'CRITICAL' ? 5 : 3,
            status: 'OPEN' as any,
            metadata: {
              sourceInspectionId: inspectionId,
              defectId: defect.id,
              severity: defect.severity,
              stage: inspection.stage,
              qty: defect.qty
            }
          }))

          // Create rework tasks
          await tx.task.createMany({
            data: reworkTasks
          })

          reworkOrder = { tasksCreated: reworkTasks.length }
        }
      }

      // Create CAPA task if requested and inspection failed
      let capaTask = null
      if (createCAPA && disposition === 'FAILED') {
        // Analyze defects for CAPA
        const defectSummary = inspection.defects.reduce((acc, defect) => {
          const code = defect.defectCode.code
          if (!acc[code]) {
            acc[code] = { count: 0, severity: defect.severity, description: defect.defectCode.description }
          }
          acc[code].count += defect.qty
          return acc
        }, {} as any)

        const topDefects = Object.entries(defectSummary)
          .sort(([,a], [,b]) => (b as any).count - (a as any).count)
          .slice(0, 3)
          .map(([code, data]) => `${code}: ${(data as any).count}x`)
          .join(', ')

        capaTask = await tx.cAPATask.create({
          data: {
            workspace_id: 'default',
            order_id: inspection.order_id,
            sourceInspectionId: inspectionId,
            title: `QC Failure Root Cause Analysis - ${inspection.order.orderNumber}`,
            description: `Systematic analysis required for QC failure in ${inspection.stage} stage. Key defects: ${topDefects}`,
            rootCause: `Initial findings: Multiple ${inspection.stage.toLowerCase()} defects detected during AQL inspection`,
            ownerId: inspection.createdBy,
            priority: inspection.defects.some(d => d.severity === 'CRITICAL') ? 'HIGH' : 'MEDIUM',
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
            created_by: session.user.id
          }
        })
      }

      // Update order routing if this affects next steps
      if (disposition === 'PASSED') {
        // Clear any shipment holds from this inspection
        const packingSteps = inspection.order.routing_steps.filter(s => s.workcenter === 'PACKING')
        if (packingSteps.length > 0) {
          await tx.routingStep.updateMany({
            where: {
              order_id: inspection.order_id,
              workcenter: 'PACKING',
              status: 'BLOCKED'
            },
            data: { status: 'READY' }
          })
        }
      }

      return { closedInspection, reworkOrder, capaTask }
    })

    // Create comprehensive audit log
    await prisma.auditLog.create({
      data: {
        user_id: session.user.id,
        action: 'CLOSE_QC_INSPECTION',
        entityType: 'QCInspection',
        entityId: inspectionId,
        details: `Closed QC inspection for ${inspection.order.orderNumber} - ${disposition}`,
        metadata: {
          disposition,
          actualDefects,
          acceptance: inspection.acceptance,
          rejection: inspection.rejection,
          aqlCompliant,
          aqlMessage,
          samplesInspected: inspection._count.samples,
          sampleSize: inspection.sampleSize,
          stage: inspection.stage,
          createRework,
          createCAPA,
          waiver: waiver || false,
          holdShipment: disposition === 'FAILED' && !waiver
        }
      }
    })

    // Generate tracking update
    await prisma.trackingUpdate.create({
      data: {
        order_id: inspection.order_id,
        stage: 'Quality Control',
        status: disposition === 'PASSED' ? 'COMPLETED' : 'FAILED',
        message: `QC inspection completed - ${disposition}. ${inspection.stage} stage: ${actualDefects} defects found in ${inspection._count.samples} samples.${!aqlCompliant ? ` ${aqlMessage}` : ''}`,
        operator: session.user.name || 'QC Inspector',
        timestamp: new Date()
      }
    })

    // Generate Ashley AI insights for pattern analysis
    if (disposition === 'FAILED' || !aqlCompliant) {
      await prisma.aIInsight.create({
        data: {
          type: 'ANOMALY',
          priority: disposition === 'FAILED' ? 'HIGH' : 'MEDIUM',
          title: `QC Quality Alert - ${inspection.stage}`,
          message: `${disposition === 'FAILED' ? 'Failed' : 'Marginal'} QC inspection detected. ${actualDefects} defects in ${inspection.stage} stage. ${aqlMessage || 'Review process controls.'}`,
          entityType: 'qc_inspection',
          entityId: inspectionId,
          actionRequired: disposition === 'FAILED',
          metadata: {
            stage: inspection.stage,
            defectCount: actualDefects,
            defectRate: inspection._count.samples > 0 ? (actualDefects / inspection._count.samples) * 100 : 0,
            orderNumber: inspection.order.orderNumber,
            aqlCompliant,
            topDefects: inspection.defects.slice(0, 3).map(d => ({
              code: d.defectCode.code,
              severity: d.severity,
              qty: d.qty
            }))
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: `QC inspection ${disposition.toLowerCase()} and closed successfully`,
      inspection: {
        id: result.closedInspection.id,
        disposition,
        status: 'CLOSED',
        actualDefects,
        acceptance: inspection.acceptance,
        rejection: inspection.rejection,
        aqlCompliant,
        aqlMessage: aqlMessage || null,
        holdShipment: disposition === 'FAILED' && !waiver,
        samplesInspected: inspection._count.samples,
        reworkOrder: result.reworkOrder,
        capaTask: result.capaTask ? {
          id: result.capaTask.id,
          title: result.capaTask.title,
          priority: result.capaTask.priority,
          dueDate: result.capaTask.dueDate
        } : null
      }
    })

  } catch (_error) {
    console.error('Error closing inspection:', _error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}