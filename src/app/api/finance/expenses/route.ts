// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const categoryId = searchParams.get("categoryId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    
    const where: any = {}
    
    if (status) {
      where.paymentStatus = status
    }
    
    if (categoryId) {
      where.categoryId = categoryId
    }
    
    if (startDate && endDate) {
      where.expenseDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        category: {
          select: {
            code: true,
            name: true,
            requiresReceipt: true
          }
        },
        vendor: {
          select: {
            id: true,
            name: true
          }
        },
        order: {
          select: {
            id: true,
            orderNumber: true
          }
        },
        trip: {
          select: {
            id: true,
            shipment: {
              select: {
                shipmentNumber: true
              }
            }
          }
        },
        submitter: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        expenseDate: "desc"
      }
    })

    return NextResponse.json({
      success: true,
      data: expenses
    })

  } catch (_error) {
    console.error("Error fetching expenses:", _error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch expenses" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Authorization check - admin/manager only
    if (session.user.role !== Role.ADMIN && session.user.role !== Role.MANAGER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await request.json()
    const {
      order_id,
      tripId,
      categoryId,
      vendorId,
      amount,
      taxAmount = 0,
      description,
      expenseDate,
      paymentMethod,
      receiptUrl,
      submittedBy,
      notes
    } = body

    if (!categoryId || !amount || !description || !expenseDate || !paymentMethod || !submittedBy) {
      return NextResponse.json(
        { success: false, error: "Category, amount, description, date, payment method, and submitter are required" },
        { status: 400 }
      )
    }

    // Generate expense number
    const expenseCount = await prisma.expense.count()
    const expenseNumber = `EXP${(expenseCount + 1).toString().padStart(6, '0')}`

    const totalAmount = amount + taxAmount

    const expense = await prisma.expense.create({
      data: {
        expenseNumber,
        order_id: order_id || null,
        tripId: tripId || null,
        categoryId,
        vendorId: vendorId || null,
        amount,
        taxAmount,
        totalAmount,
        description,
        expenseDate: new Date(expenseDate),
        paymentMethod,
        receiptUrl: receiptUrl || null,
        submittedBy,
        notes: notes || null
      },
      include: {
        category: {
          select: {
            code: true,
            name: true,
            requiresReceipt: true
          }
        },
        vendor: {
          select: {
            id: true,
            name: true
          }
        },
        order: {
          select: {
            id: true,
            orderNumber: true
          }
        },
        submitter: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: expense
    })

  } catch (_error) {
    console.error("Error creating expense:", _error)
    return NextResponse.json(
      { success: false, error: "Failed to create expense" },
      { status: 500 }
    )
  }
}