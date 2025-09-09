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
    const type = searchParams.get("type")
    const active = searchParams.get("active")
    
    const where: any = {}
    
    if (type) {
      where.accountType = type
    }
    
    if (active !== null) {
      where.isActive = active === "true"
    }

    const accounts = await prisma.chartOfAccount.findMany({
      where,
      include: {
        parent: true,
        children: {
          include: {
            children: true
          }
        },
        _count: {
          select: {
            journalEntries: true,
            budgetLines: true
          }
        }
      },
      orderBy: {
        accountCode: "asc"
      }
    })

    return NextResponse.json({
      success: true,
      data: accounts
    })

  } catch (_error) {
    console.error("Error fetching chart of accounts:", _error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch accounts" },
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
      accountCode,
      accountName,
      parentId,
      accountType,
      category,
      description
    } = body

    if (!accountCode || !accountName || !accountType) {
      return NextResponse.json(
        { success: false, error: "Account code, name, and type are required" },
        { status: 400 }
      )
    }

    // Check if account code already exists
    const existingAccount = await prisma.chartOfAccount.findUnique({
      where: { accountCode }
    })

    if (existingAccount) {
      return NextResponse.json(
        { success: false, error: "Account code already exists" },
        { status: 409 }
      )
    }

    const account = await prisma.chartOfAccount.create({
      data: {
        accountCode,
        accountName,
        parentId: parentId || null,
        accountType,
        category: category || accountType,
        description,
        isSystem: false
      },
      include: {
        parent: true,
        children: true
      }
    })

    return NextResponse.json({
      success: true,
      data: account
    })

  } catch (_error) {
    console.error("Error creating account:", _error)
    return NextResponse.json(
      { success: false, error: "Failed to create account" },
      { status: 500 }
    )
  }
}