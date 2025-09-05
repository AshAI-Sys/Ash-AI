/**
 * ASH AI - Stage 3: Cutting - Fabric Issue Management API
 * Professional fabric warehouse to cutting floor workflow
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'
import { z } from 'zod'

const fabricIssueSchema = z.object({
  order_id: z.string().min(1, 'Order ID is required'),
  fabric_batches: z.array(z.object({
    batch_id: z.string().min(1, 'Batch ID is required'),
    fabric_type: z.string().min(1, 'Fabric type is required'),
    color_code: z.string().min(1, 'Color code is required'),
    requested_meters: z.number().positive('Requested meters must be positive'),
    actual_meters: z.number().positive('Actual meters must be positive'),
    width_cm: z.number().positive('Width must be positive'),
    gsm: z.number().positive('GSM must be positive'),
    supplier: z.string().optional(),
    lot_number: z.string().optional(),
    quality_grade: z.enum(['A', 'B', 'C']).default('A')
  })).min(1, 'At least one fabric batch is required'),
  cutting_notes: z.string().optional(),
  priority: z.enum(['NORMAL', 'URGENT', 'RUSH']).default('NORMAL'),
  expected_lay_count: z.number().positive().optional()
})

/**
 * POST /api/cutting/fabric-issue - Issue fabric from warehouse to cutting
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only certain roles can issue fabric
    if (![Role.ADMIN, Role.MANAGER, Role.WAREHOUSE_MANAGER, Role.CUTTING_SUPERVISOR].includes(session.user.role as Role)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions to issue fabric' 
      }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = fabricIssueSchema.parse(body)

    // Verify order exists and is in correct status
    const order = await prisma.order.findFirst({
      where: {
        id: validatedData.order_id,
        workspace_id: session.user.workspaceId,
        status: {
          in: ['PRODUCTION_PLANNED', 'IN_PROGRESS']
        }
      },
      include: {
        brand: { select: { name: true, code: true } },
        client: { select: { name: true } }
      }
    })

    if (!order) {
      return NextResponse.json({ 
        error: 'Order not found or not ready for fabric issue' 
      }, { status: 404 })
    }

    // Check fabric availability in warehouse
    const availabilityCheck = await checkFabricAvailability(
      validatedData.fabric_batches, 
      session.user.workspaceId
    )

    if (!availabilityCheck.available) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient fabric stock',
        shortfalls: availabilityCheck.shortfalls
      }, { status: 422 })
    }

    // Create fabric issue record
    const fabricIssue = await prisma.$transaction(async (tx) => {
      const issueId = require('nanoid').nanoid()

      // Create main fabric issue record
      const issue = await tx.fabricIssue.create({
        data: {
          id: issueId,
          workspace_id: session.user.workspaceId,
          order_id: validatedData.order_id,
          issued_by_id: session.user.id,
          status: 'ISSUED',
          priority: validatedData.priority,
          cutting_notes: validatedData.cutting_notes,
          expected_lay_count: validatedData.expected_lay_count,
          issue_date: new Date(),
          metadata: {
            total_batches: validatedData.fabric_batches.length,
            total_meters: validatedData.fabric_batches.reduce((sum, b) => sum + b.actual_meters, 0)
          }
        }
      })

      // Create fabric batch records
      for (const batch of validatedData.fabric_batches) {
        const batchId = require('nanoid').nanoid()
        
        await tx.fabricBatch.create({
          data: {
            id: batchId,
            workspace_id: session.user.workspaceId,
            fabric_issue_id: issueId,
            batch_number: batch.batch_id,
            fabric_type: batch.fabric_type,
            color_code: batch.color_code,
            requested_meters: batch.requested_meters,
            actual_meters: batch.actual_meters,
            width_cm: batch.width_cm,
            gsm: batch.gsm,
            supplier: batch.supplier,
            lot_number: batch.lot_number,
            quality_grade: batch.quality_grade,
            status: 'AVAILABLE_FOR_CUTTING',
            qr_code: await generateQRCode('FABRIC', batchId),
            metadata: {
              area_sqm: (batch.actual_meters * batch.width_cm) / 10000, // Convert to sqm
              weight_kg: ((batch.actual_meters * batch.width_cm * batch.gsm) / 1000000) // Rough weight calculation
            }
          }
        })

        // Update warehouse inventory
        await updateWarehouseInventory(tx, batch, session.user.workspaceId)
      }

      return issue
    })

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        id: require('nanoid').nanoid(),
        workspace_id: session.user.workspaceId,
        actor_id: session.user.id,
        entity_type: 'fabric_issue',
        entity_id: fabricIssue.id,
        action: 'CREATE',
        after_data: validatedData,
        metadata: {
          source: 'fabric_issue_api',
          order_po: order.po_number,
          brand: order.brand.name,
          total_meters: validatedData.fabric_batches.reduce((sum, b) => sum + b.actual_meters, 0)
        }
      }
    })

    // Emit fabric issue event
    await emitFabricEvent('ash.fabric.issued', {
      issue_id: fabricIssue.id,
      order_id: validatedData.order_id,
      total_meters: validatedData.fabric_batches.reduce((sum, b) => sum + b.actual_meters, 0),
      batch_count: validatedData.fabric_batches.length,
      priority: validatedData.priority,
      issued_by: session.user.id
    })

    // Get complete fabric issue with batches
    const completeFabricIssue = await prisma.fabricIssue.findUnique({
      where: { id: fabricIssue.id },
      include: {
        fabric_batches: true,
        issued_by: {
          select: { full_name: true }
        },
        order: {
          select: {
            po_number: true,
            brand: { select: { name: true } }
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Fabric issued successfully to cutting floor',
      fabric_issue: completeFabricIssue,
      next_steps: [
        'Print QR code labels for fabric batches',
        'Transport fabric to cutting department',
        'Scan batches upon receipt in cutting',
        'Begin lay planning process'
      ]
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }

    console.error('Fabric issue error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to issue fabric'
    }, { status: 500 })
  }
}

/**
 * GET /api/cutting/fabric-issue - Get fabric issue records
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const order_id = searchParams.get('order_id')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const whereConditions: any = {
      workspace_id: session.user.workspaceId
    }

    if (order_id) whereConditions.order_id = order_id
    if (status) whereConditions.status = status
    if (priority) whereConditions.priority = priority

    const fabricIssues = await prisma.fabricIssue.findMany({
      where: whereConditions,
      include: {
        fabric_batches: {
          select: {
            id: true,
            batch_number: true,
            fabric_type: true,
            color_code: true,
            actual_meters: true,
            width_cm: true,
            gsm: true,
            quality_grade: true,
            status: true,
            qr_code: true
          }
        },
        issued_by: {
          select: {
            full_name: true
          }
        },
        order: {
          select: {
            po_number: true,
            brand: { select: { name: true, code: true } },
            client: { select: { name: true } }
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      skip: offset,
      take: limit
    })

    // Get summary statistics
    const summaryStats = await getFabricIssueSummary(session.user.workspaceId)

    return NextResponse.json({
      success: true,
      fabric_issues: fabricIssues,
      summary: summaryStats,
      pagination: {
        limit,
        offset,
        total: await prisma.fabricIssue.count({ where: whereConditions })
      }
    })

  } catch (error) {
    console.error('Get fabric issues error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve fabric issues'
    }, { status: 500 })
  }
}

// Helper functions
async function checkFabricAvailability(batches: any[], workspaceId: string) {
  const availability = {
    available: true,
    shortfalls: [] as any[]
  }

  for (const batch of batches) {
    // In a real system, this would check actual warehouse inventory
    // For now, we'll simulate inventory check
    const availableStock = await simulateWarehouseCheck(batch, workspaceId)
    
    if (availableStock < batch.actual_meters) {
      availability.available = false
      availability.shortfalls.push({
        batch_id: batch.batch_id,
        fabric_type: batch.fabric_type,
        color_code: batch.color_code,
        requested: batch.actual_meters,
        available: availableStock,
        shortfall: batch.actual_meters - availableStock
      })
    }
  }

  return availability
}

async function simulateWarehouseCheck(batch: any, workspaceId: string): Promise<number> {
  // This would interface with your warehouse management system
  // For simulation, return sufficient stock for most cases
  const baseStock = Math.random() * 100 + 50 // 50-150 meters
  return Math.max(baseStock, batch.actual_meters * 1.1) // Usually have 10% extra
}

async function updateWarehouseInventory(tx: any, batch: any, workspaceId: string) {
  // In a real system, this would update your warehouse inventory system
  // Create inventory transaction record
  await tx.inventoryTransaction.create({
    data: {
      id: require('nanoid').nanoid(),
      workspace_id: workspaceId,
      transaction_type: 'ISSUE',
      item_type: 'FABRIC',
      item_code: `${batch.fabric_type}-${batch.color_code}`,
      quantity_before: 1000, // Would come from actual inventory
      quantity_change: -batch.actual_meters,
      quantity_after: 1000 - batch.actual_meters,
      unit: 'METERS',
      reference_type: 'FABRIC_ISSUE',
      reference_id: batch.batch_id,
      created_by: 'system'
    }
  })
}

async function generateQRCode(prefix: string, id: string): Promise<string> {
  // Generate QR code data - in production you'd use a QR code library
  const timestamp = Date.now().toString(36).toUpperCase()
  return `${prefix}-${id.slice(-8).toUpperCase()}-${timestamp}`
}

async function getFabricIssueSummary(workspaceId: string) {
  const [statusCounts, totalMeters, recentActivity] = await Promise.all([
    prisma.fabricIssue.groupBy({
      by: ['status'],
      where: { workspace_id: workspaceId },
      _count: true
    }),
    prisma.fabricBatch.aggregate({
      where: {
        workspace_id: workspaceId,
        created_at: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      _sum: {
        actual_meters: true
      }
    }),
    prisma.fabricIssue.count({
      where: {
        workspace_id: workspaceId,
        created_at: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    })
  ])

  return {
    status_distribution: statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count
      return acc
    }, {} as Record<string, number>),
    total_meters_issued_week: totalMeters._sum.actual_meters || 0,
    issues_last_24h: recentActivity,
    pending_issues: statusCounts.find(s => s.status === 'ISSUED')?._count || 0
  }
}

async function emitFabricEvent(eventType: string, data: any) {
  try {
    await prisma.systemEvent.create({
      data: {
        id: require('nanoid').nanoid(),
        event_type: eventType,
        entity_type: 'fabric_issue',
        entity_id: data.issue_id,
        data: data,
        status: 'PENDING',
        created_at: new Date()
      }
    })
  } catch (error) {
    console.error('Failed to emit fabric event:', error)
  }
}