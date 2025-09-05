import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period")
    const employeeId = searchParams.get("employeeId")
    const status = searchParams.get("status")
    
    const where: any = {}
    
    if (period) {
      where.period = period
    }
    
    if (employeeId) {
      where.employeeId = employeeId
    }
    
    if (status) {
      where.status = status
    }

    const payrolls = await prisma.payroll.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        processor: {
          select: {
            id: true,
            name: true
          }
        },
        approver: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { period: "desc" },
        { employee: { name: "asc" } }
      ]
    })

    return NextResponse.json({
      success: true,
      data: payrolls
    })

  } catch (error) {
    console.error("Error fetching payroll:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch payroll" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      employeeId,
      period,
      startDate,
      endDate,
      basicSalary = 0,
      overtimeHours = 0,
      overtimeRate = 0,
      piecesCompleted = 0,
      pieceRate = 0,
      allowances = 0,
      bonuses = 0,
      otherIncome = 0,
      sssContribution = 0,
      philhealthContribution = 0,
      pagibigContribution = 0,
      withholdingTax = 0,
      otherDeductions = 0,
      processedBy
    } = body

    if (!employeeId || !period || !startDate || !endDate || !processedBy) {
      return NextResponse.json(
        { success: false, error: "Employee, period, dates, and processor are required" },
        { status: 400 }
      )
    }

    // Calculate totals
    const overtimePay = overtimeHours * overtimeRate
    const pieceRatePay = piecesCompleted * pieceRate
    const grossPay = basicSalary + overtimePay + pieceRatePay + allowances + bonuses + otherIncome
    const totalDeductions = sssContribution + philhealthContribution + pagibigContribution + withholdingTax + otherDeductions
    const netPay = grossPay - totalDeductions

    // Generate payroll number
    const payrollCount = await prisma.payroll.count()
    const payrollNumber = `PAY${period}-${(payrollCount + 1).toString().padStart(4, '0')}`

    const payroll = await prisma.payroll.create({
      data: {
        payrollNumber,
        employeeId,
        period,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        basicSalary,
        overtimeHours,
        overtimeRate,
        overtimePay,
        piecesCompleted,
        pieceRate,
        pieceRatePay,
        allowances,
        bonuses,
        otherIncome,
        sssContribution,
        philhealthContribution,
        pagibigContribution,
        withholdingTax,
        otherDeductions,
        grossPay,
        totalDeductions,
        netPay,
        processedBy
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        processor: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: payroll
    })

  } catch (error) {
    console.error("Error creating payroll:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create payroll" },
      { status: 500 }
    )
  }
}