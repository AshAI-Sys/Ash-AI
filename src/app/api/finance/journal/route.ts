import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    
    const where: any = {}
    
    if (status) {
      where.status = status
    }
    
    if (startDate && endDate) {
      where.entryDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    const entries = await prisma.journalEntry.findMany({
      where,
      include: {
        creator: {
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
        },
        lines: {
          include: {
            account: {
              select: {
                accountCode: true,
                accountName: true,
                accountType: true
              }
            }
          },
          orderBy: { debitAmount: "desc" }
        }
      },
      orderBy: {
        entryDate: "desc"
      }
    })

    return NextResponse.json({
      success: true,
      data: entries
    })

  } catch (_error) {
    console.error("Error fetching journal entries:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch journal entries" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      reference,
      description,
      entryDate,
      lines,
      createdBy
    } = body

    if (!description || !entryDate || !lines || lines.length === 0) {
      return NextResponse.json(
        { success: false, error: "Description, entry date, and journal lines are required" },
        { status: 400 }
      )
    }

    // Validate that debits equal credits
    const totalDebits = lines.reduce((sum: number, line: any) => sum + (line.debitAmount || 0), 0)
    const totalCredits = lines.reduce((sum: number, line: any) => sum + (line.creditAmount || 0), 0)

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      return NextResponse.json(
        { success: false, error: "Total debits must equal total credits" },
        { status: 400 }
      )
    }

    // Generate entry number
    const entryCount = await prisma.journalEntry.count()
    const entryNumber = `JE${(entryCount + 1).toString().padStart(6, '0')}`

    const result = await prisma.$transaction(async (tx) => {
      const entry = await tx.journalEntry.create({
        data: {
          entryNumber,
          reference,
          description,
          entryDate: new Date(entryDate),
          postingDate: new Date(),
          totalDebit: totalDebits,
          totalCredit: totalCredits,
          status: "DRAFT",
          createdBy
        }
      })

      for (const line of lines) {
        await tx.journalLine.create({
          data: {
            entryId: entry.id,
            accountId: line.accountId,
            debitAmount: line.debitAmount || 0,
            creditAmount: line.creditAmount || 0,
            description: line.description,
            reference: line.reference,
            costCenter: line.costCenter,
            project: line.project
          }
        })
      }

      return tx.journalEntry.findUnique({
        where: { id: entry.id },
        include: {
          creator: {
            select: { id: true, name: true }
          },
          lines: {
            include: {
              account: {
                select: {
                  accountCode: true,
                  accountName: true,
                  accountType: true
                }
              }
            }
          }
        }
      })
    })

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (_error) {
    console.error("Error creating journal entry:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create journal entry" },
      { status: 500 }
    )
  }
}