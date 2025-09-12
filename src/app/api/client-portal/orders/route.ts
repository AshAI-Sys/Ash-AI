// @ts-nocheck
/**
 * ASH AI - Client Portal Orders API
 * Client-specific order management and tracking
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET or NEXTAUTH_SECRET environment variable is required for production')
}

/**
 * GET /api/client-portal/orders - Get client's orders
 */
export async function GET(request: NextRequest) {
  try {
    // Verify client session
    const token = request.cookies.get('client-portal-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any
    const client_id = decoded.client_id
    const workspace_id = decoded.workspace_id

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const brand = searchParams.get('brand')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const include_details = searchParams.get('include_details') === 'true'

    // Build filter conditions
    const whereConditions: any = {
      client_id: client_id,
      workspace_id: workspace_id
    }

    if (status && status !== 'all') {
      whereConditions.status = status
    }

    if (brand) {
      whereConditions.brand_id = brand
    }

    // Get orders with optional detailed information
    const orders = await prisma.order.findMany({
      where: whereConditions,
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        ...(include_details && {
          routing_steps: {
            select: {
              id: true,
              name: true,
              workcenter: true,
              sequence: true,
              status: true,
              planned_start: true,
              planned_end: true,
              actual_start: true,
              actual_end: true,
              standard_spec: true
            },
            orderBy: {
              sequence: 'asc'
            }
          },
          design_assets: {
            select: {
              id: true,
              version: true,
              type: true,
              file_name: true,
              file_path: true,
              approval_status: true,
              client_feedback: true,
              created_at: true,
              approved_at: true
            },
            orderBy: {
              created_at: 'desc'
            }
          },
          deliveries: {
            select: {
              id: true,
              status: true,
              scheduled_at: true,
              completed_at: true,
              tracking_number: true,
              vehicle: {
                select: {
                  plate: true,
                  type: true,
                  driver_name: true,
                  driver_phone: true
                }
              }
            },
            orderBy: {
              scheduled_at: 'desc'
            }
          },
          qc_records: {
            select: {
              id: true,
              passed: true,
              passed_qty: true,
              rejected_qty: true,
              notes: true,
              created_at: true,
              inspector: {
                select: {
                  full_name: true
                }
              }
            },
            orderBy: {
              created_at: 'desc'
            }
          }
        })
      },
      orderBy: {
        created_at: 'desc'
      },
      skip: offset,
      take: limit
    })

    // Get total count for pagination
    const totalCount = await prisma.order.count({
      where: whereConditions
    })

    // Calculate enhanced order data
    const enhancedOrders = orders.map(order => {
      const baseOrder = {
        id: order.id,
        po_number: order.po_number,
        status: order.status,
        brand: order.brand,
        product_type: order.product_type,
        method: order.method,
        total_qty: order.total_qty,
        size_curve: order.size_curve,
        target_delivery_date: order.target_delivery_date,
        created_at: order.created_at,
        updated_at: order.updated_at
      }

      if (!include_details) {
        return {
          ...baseOrder,
          progress_percentage: 0, // Will be calculated on detail view
          current_step: 'Loading...',
          design_status: 'Not available',
          delivery_status: 'Not available'
        }
      }

      // Calculate detailed metrics
      const progress_percentage = calculateOrderProgress(order.routing_steps || [])
      const current_step = getCurrentStep(order.routing_steps || [])
      const design_status = getDesignStatus(order.design_assets || [])
      const delivery_status = getDeliveryStatus(order.deliveries || [])
      const quality_summary = getQualitySummary(order.qc_records || [])

      return {
        ...baseOrder,
        progress_percentage,
        current_step,
        design_status,
        delivery_status,
        quality_summary,
        routing_steps: order.routing_steps,
        design_assets: order.design_assets,
        deliveries: order.deliveries,
        qc_records: order.qc_records,
        estimated_completion: calculateEstimatedCompletion(order, order.routing_steps || [])
      }
    })

    // Get summary statistics
    const summaryStats = await getOrderSummaryStats(client_id, workspace_id)

    return NextResponse.json({
      success: true,
      orders: enhancedOrders,
      pagination: {
        total: totalCount,
        limit,
        offset,
        has_more: offset + limit < totalCount
      },
      summary: summaryStats
    })

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    console.error('Client orders error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to load orders' 
    }, { status: 500 })
  }
}

// Helper functions
function calculateOrderProgress(routing_steps: any[]): number {
  if (routing_steps.length === 0) return 0
  
  const statusWeights = {
    'PLANNED': 0,
    'READY': 25,
    'IN_PROGRESS': 75,
    'DONE': 100,
    'BLOCKED': 0
  }

  const totalProgress = routing_steps.reduce((sum, step) => {
    return sum + (statusWeights[step.status as keyof typeof statusWeights] || 0)
  }, 0)

  return Math.round(totalProgress / routing_steps.length)
}

function getCurrentStep(routing_steps: any[]): string {
  const activeStep = routing_steps.find(step => 
    step.status === 'IN_PROGRESS' || step.status === 'READY'
  )
  
  if (activeStep) {
    return `${activeStep.name} (${activeStep.workcenter})`
  }

  const nextStep = routing_steps.find(step => step.status === 'PLANNED')
  if (nextStep) {
    return `Upcoming: ${nextStep.name}`
  }

  const completedSteps = routing_steps.filter(step => step.status === 'DONE').length
  if (completedSteps === routing_steps.length && routing_steps.length > 0) {
    return 'Production Complete'
  }

  return 'Not started'
}

function getDesignStatus(design_assets: any[]): { status: string; details: any } {
  if (design_assets.length === 0) {
    return {
      status: 'No designs uploaded',
      details: { total: 0, pending: 0, approved: 0, rejected: 0 }
    }
  }
  
  const statusCounts = design_assets.reduce((acc, asset) => {
    acc[asset.approval_status] = (acc[asset.approval_status] || 0) + 1
    acc.total++
    return acc
  }, { total: 0, PENDING_CLIENT_APPROVAL: 0, APPROVED: 0, REJECTED: 0, PENDING_INTERNAL_REVIEW: 0 })

  if (statusCounts.PENDING_CLIENT_APPROVAL > 0) {
    return {
      status: 'Pending your approval',
      details: {
        total: statusCounts.total,
        pending: statusCounts.PENDING_CLIENT_APPROVAL,
        approved: statusCounts.APPROVED,
        rejected: statusCounts.REJECTED
      }
    }
  } else if (statusCounts.APPROVED === statusCounts.total) {
    return {
      status: 'All designs approved',
      details: {
        total: statusCounts.total,
        pending: 0,
        approved: statusCounts.APPROVED,
        rejected: statusCounts.REJECTED
      }
    }
  } else if (statusCounts.REJECTED > 0) {
    return {
      status: 'Revision needed',
      details: {
        total: statusCounts.total,
        pending: statusCounts.PENDING_CLIENT_APPROVAL,
        approved: statusCounts.APPROVED,
        rejected: statusCounts.REJECTED
      }
    }
  }
  
  return {
    status: 'Under review',
    details: {
      total: statusCounts.total,
      pending: statusCounts.PENDING_INTERNAL_REVIEW + statusCounts.PENDING_CLIENT_APPROVAL,
      approved: statusCounts.APPROVED,
      rejected: statusCounts.REJECTED
    }
  }
}

function getDeliveryStatus(deliveries: any[]): { status: string; details: any } {
  if (deliveries.length === 0) {
    return {
      status: 'Not scheduled',
      details: null
    }
  }

  const latestDelivery = deliveries[0]
  
  switch (latestDelivery.status) {
    case 'SCHEDULED':
      return {
        status: 'Scheduled',
        details: {
          scheduled_at: latestDelivery.scheduled_at,
          tracking_number: latestDelivery.tracking_number,
          vehicle: latestDelivery.vehicle
        }
      }
    case 'IN_TRANSIT':
      return {
        status: 'In transit',
        details: {
          scheduled_at: latestDelivery.scheduled_at,
          tracking_number: latestDelivery.tracking_number,
          vehicle: latestDelivery.vehicle
        }
      }
    case 'DELIVERED':
      return {
        status: 'Delivered',
        details: {
          completed_at: latestDelivery.completed_at,
          tracking_number: latestDelivery.tracking_number
        }
      }
    case 'FAILED':
      return {
        status: 'Delivery failed',
        details: {
          scheduled_at: latestDelivery.scheduled_at,
          tracking_number: latestDelivery.tracking_number
        }
      }
    default:
      return {
        status: 'Unknown',
        details: latestDelivery
      }
  }
}

function getQualitySummary(qcRecords: any[]): { status: string; details: any } {
  if (qcRecords.length === 0) {
    return {
      status: 'Not inspected',
      details: { total_inspected: 0, total_passed: 0, total_rejected: 0 }
    }
  }

  const totals = qcRecords.reduce((acc, record) => {
    acc.total_inspected += (record.passed_qty || 0) + (record.rejected_qty || 0)
    acc.total_passed += record.passed_qty || 0
    acc.total_rejected += record.rejected_qty || 0
    return acc
  }, { total_inspected: 0, total_passed: 0, total_rejected: 0 })

  const passRate = totals.total_inspected > 0 
    ? Math.round((totals.total_passed / totals.total_inspected) * 100)
    : 0

  return {
    status: passRate >= 95 ? 'Excellent quality' : 
            passRate >= 85 ? 'Good quality' : 
            passRate >= 70 ? 'Acceptable quality' : 'Quality issues detected',
    details: {
      ...totals,
      pass_rate: passRate,
      latest_inspection: qcRecords[0]?.created_at,
      inspector: qcRecords[0]?.inspector?.full_name
    }
  }
}

function calculateEstimatedCompletion(order: any, routing_steps: any[]): Date {
  // Simple estimation based on remaining steps
  const remainingSteps = routing_steps.filter(step => 
    step.status !== 'DONE'
  ).length

  const avgDaysPerStep = 1.5 // Average days per step
  const estimatedDays = remainingSteps * avgDaysPerStep
  
  const now = new Date()
  return new Date(new Date(now).getTime() + estimatedDays * 24 * 60 * 60 * 1000)
}

async function getOrderSummaryStats(client_id: string, workspace_id: string) {
  const statusCounts = await prisma.order.groupBy({
    by: ['status'],
    where: {
      client_id: client_id,
      workspace_id: workspace_id
    },
    _count: true
  })

  const brandCounts = await prisma.order.groupBy({
    by: ['brand_id'],
    where: {
      client_id: client_id,
      workspace_id: workspace_id
    },
    _count: true,
    _sum: {
      total_qty: true
    }
  })

  // Get pending approvals count
  const pendingApprovals = await prisma.designAsset.count({
    where: {
      approval_status: 'PENDING_CLIENT_APPROVAL',
      order: {
        client_id: client_id,
        workspace_id: workspace_id
      }
    }
  })

  return {
    status_distribution: statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count
      return acc
    }, {} as Record<string, number>),
    brand_distribution: brandCounts.map(item => ({
      brand_id: item.brand_id,
      order_count: item._count,
      total_quantity: item._sum.total_qty || 0
    })),
    pending_design_approvals: pendingApprovals,
    total_orders: statusCounts.reduce((sum, item) => sum + item._count, 0)
  }
}