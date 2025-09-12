// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const syncSchema = z.object({
  platformId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  sessionId: z.string().optional()
})

const saleDataSchema = z.array(z.object({
  saleId: z.string(),
  productName: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  totalAmount: z.number(),
  fees: z.number().default(0),
  saleDate: z.string(),
  customerInfo: z.object({
    name: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional()
  }).optional()
}))

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { platformId, startDate, endDate, sessionId } = syncSchema.parse(body)

    // Get platform information
    const platform = await prisma.liveSellingPlatform.findUnique({
      where: { id: platformId }
    })

    if (!platform) {
      return NextResponse.json(
        { success: false, message: 'Platform not found' },
        { status: 404 }
      )
    }

    // Simulate fetching sales data from platform API
    // In production, this would integrate with actual platform APIs
    const salesData = await fetchPlatformSales(platform.name, startDate, endDate)
    
    let syncedCount = 0
    let duplicateCount = 0
    let errorCount = 0
    const errors: string[] = []

    for (const saleData of salesData) {
      try {
        // Check if sale already exists
        const existingSale = await prisma.platformSale.findUnique({
          where: {
            platformId_saleId: {
              platformId: platformId,
              saleId: saleData.saleId
            }
          }
        })

        if (existingSale) {
          duplicateCount++
          continue
        }

        // Create new platform sale
        await prisma.platformSale.create({
          data: {
            platformId: platformId,
            sessionId: sessionId || null,
            sellerId: await getDefaultSellerId(),
            saleId: saleData.saleId,
            productName: saleData.productName,
            quantity: saleData.quantity,
            unitPrice: saleData.unitPrice,
            totalAmount: saleData.totalAmount,
            fees: saleData.fees,
            netAmount: saleData.totalAmount - saleData.fees,
            status: 'OPEN',
            saleDate: new Date(saleData.saleDate),
            reconciled: false
          }
        })

        syncedCount++

      } catch (_error) {
        errorCount++
        errors.push(`Sale ${saleData.saleId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Log sync activity
    await prisma.auditLog.create({
      data: {
        action: 'SYNC_PLATFORM_SALES',
        entity: 'PlatformSale',
        newValues: {
          platformId,
          syncedCount,
          duplicateCount,
          errorCount,
          dateRange: { startDate, endDate }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Sales sync completed',
      summary: {
        total: salesData.length,
        synced: syncedCount,
        duplicates: duplicateCount,
        errors: errorCount,
        errorDetails: errors.slice(0, 10) // Limit error details
      }
    })

  } catch (_error) {
    console.error('Live selling sync error:', _error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid request data', 
          errors: error.errors 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to sync platform sales' 
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const platformId = url.searchParams.get('platformId')
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')

    const whereConditions: any = {}
    
    if (platformId) {
      whereConditions.platformId = platformId
    }
    
    if (startDate && endDate) {
      whereConditions.saleDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    const sales = await prisma.platformSale.findMany({
      where: whereConditions,
      include: {
        platform: true,
        seller: true,
        session: true
      },
      orderBy: {
        saleDate: 'desc'
      },
      take: 100
    })

    const summary = await prisma.platformSale.groupBy({
      by: ['status', 'reconciled'],
      where: whereConditions,
      _count: {
        id: true
      },
      _sum: {
        totalAmount: true,
        netAmount: true,
        fees: true
      }
    })

    return NextResponse.json({
      success: true,
      sales,
      summary
    })

  } catch (_error) {
    console.error('Get platform sales error:', _error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch platform sales' 
      },
      { status: 500 }
    )
  }
}

// Mock function to simulate platform API integration
async function fetchPlatformSales(platformName: string, startDate: string, endDate: string) {
  // In production, integrate with actual platform APIs:
  // - TikTok Shop API
  // - Shopee API
  // - Lazada API
  // - Facebook/Instagram Shopping API
  
  // Mock data for demonstration
  const mockSales = [
    {
      saleId: `${platformName}-${Date.now()}-1`,
      productName: 'Custom T-Shirt - Design A',
      quantity: 2,
      unitPrice: 299,
      totalAmount: 598,
      fees: 59.8, // 10% platform fee
      saleDate: new Date().toISOString(),
      customerInfo: {
        name: 'Customer A',
        address: 'Manila, Philippines'
      }
    },
    {
      saleId: `${platformName}-${Date.now()}-2`,
      productName: 'Corporate Polo - Navy',
      quantity: 5,
      unitPrice: 450,
      totalAmount: 2250,
      fees: 225,
      saleDate: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      customerInfo: {
        name: 'Company B',
        address: 'Quezon City, Philippines'
      }
    }
  ]

  return mockSales
}

async function getDefaultSellerId(): Promise<string> {
  const seller = await prisma.user.findFirst({
    where: {
      role: 'LIVE_SELLER'
    }
  })
  return seller?.id || 'system'
}