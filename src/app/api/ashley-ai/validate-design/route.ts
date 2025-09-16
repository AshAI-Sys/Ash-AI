import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

// Schema for design validation request
const validateDesignSchema = z.object({
  asset_id: z.string().uuid(),
  version: z.number().int().positive(),
  method: z.enum(['SILKSCREEN', 'SUBLIMATION', 'DTF', 'EMBROIDERY'])
})

// POST /api/ashley-ai/validate-design - Ashley's printability checks
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { asset_id, version, method } = validateDesignSchema.parse(body)

    // Get design version details
    const designVersion = await prisma.designVersion.findUnique({
      where: {
        asset_id_version: { asset_id, version }
      },
      include: {
        asset: {
          include: {
            order: {
              select: {
                po_number: true,
                product_type: true,
                total_qty: true
              }
            }
          }
        }
      }
    })

    if (!designVersion) {
      return NextResponse.json(
        { error: 'Design version not found' },
        { status: 404 }
      )
    }

    // Run printability checks based on method
    const checkResult = await runPrintabilityChecks(designVersion, method)

    // Store design check result
    await prisma.designCheck.create({
      data: {
        asset_id,
        version,
        method,
        result: checkResult.result,
        issues: checkResult.issues,
        metrics: checkResult.metrics
      }
    })

    return NextResponse.json({
      asset_id,
      version,
      method,
      check_result: checkResult,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in Ashley AI design validation:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Design validation failed' },
      { status: 500 }
    )
  }
}

// GET /api/ashley-ai/validate-design?asset_id=...&version=... - Get design check results
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const asset_id = searchParams.get('asset_id')
    const version = searchParams.get('version')

    if (!asset_id || !version) {
      return NextResponse.json(
        { error: 'asset_id and version parameters are required' },
        { status: 400 }
      )
    }

    const designChecks = await prisma.designCheck.findMany({
      where: {
        asset_id,
        version: parseInt(version)
      },
      orderBy: { created_at: 'desc' }
    })

    return NextResponse.json({
      asset_id,
      version: parseInt(version),
      checks: designChecks
    })

  } catch (error) {
    console.error('Error fetching design checks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch design checks' },
      { status: 500 }
    )
  }
}

// Ashley AI printability checks implementation
async function runPrintabilityChecks(designVersion: any, method: string) {
  const issues = []
  const metrics: Record<string, any> = {}
  let result = 'PASS'

  try {
    const files = designVersion.files as any
    const placements = designVersion.placements as any[] || []
    const meta = designVersion.meta as any || {}

    // 1. DPI Check
    const requiredDPI = method === 'SUBLIMATION' || placements.some((p: any) => p.area === 'all-over') ? 200 : 150
    const actualDPI = meta.dpi || 150

    metrics.min_dpi = requiredDPI
    metrics.actual_dpi = actualDPI

    if (actualDPI < requiredDPI) {
      issues.push({
        code: 'LOW_DPI',
        message: `DPI ${actualDPI} below required ${requiredDPI} for ${method}`,
        placement_ref: null
      })
      result = 'WARN'
    }

    // 2. Method-specific checks
    switch (method) {
      case 'SILKSCREEN':
        await checkSilkscreenRequirements(placements, files, issues, metrics)
        break

      case 'SUBLIMATION':
        await checkSublimationRequirements(placements, files, issues, metrics)
        break

      case 'DTF':
        await checkDTFRequirements(placements, files, issues, metrics)
        break

      case 'EMBROIDERY':
        await checkEmbroideryRequirements(placements, files, issues, metrics)
        break
    }

    // 3. Placement boundary checks
    for (const placement of placements) {
      if (placement.area && placement.width_cm && placement.height_cm) {
        // Check if placement crosses seams (simplified)
        if (placement.area === 'front' && placement.width_cm > 30) {
          issues.push({
            code: 'PLACEMENT_TOO_WIDE',
            message: 'Front placement may cross side seams',
            placement_ref: placement.area
          })
          if (method === 'SILKSCREEN') {
            result = 'WARN'
          }
        }
      }
    }

    // 4. File validation
    if (!files.mockup_url) {
      issues.push({
        code: 'MISSING_MOCKUP',
        message: 'Mockup file required for approval',
        placement_ref: null
      })
      result = 'WARN'
    }

    if (method === 'SILKSCREEN' && (!files.separations || files.separations.length === 0)) {
      issues.push({
        code: 'MISSING_SEPARATIONS',
        message: 'Color separations required for silkscreen',
        placement_ref: null
      })
      result = 'FAIL'
    }

    if (method === 'EMBROIDERY' && !files.dst_url) {
      issues.push({
        code: 'MISSING_DIGITIZED',
        message: 'Digitized file (DST/EMB) required for embroidery',
        placement_ref: null
      })
      result = 'FAIL'
    }

    // Determine final result
    if (issues.some((i: any) => i.code.includes('MISSING') && method === 'SILKSCREEN')) {
      result = 'FAIL'
    }

  } catch (error) {
    console.error('Error in printability checks:', error)
    issues.push({
      code: 'CHECK_ERROR',
      message: 'Unable to complete printability analysis',
      placement_ref: null
    })
    result = 'WARN'
  }

  return { result, issues, metrics }
}

// Method-specific validation functions
async function checkSilkscreenRequirements(placements: any[], files: any, issues: any[], metrics: any) {
  // Calculate expected ink usage
  const totalArea = placements.reduce((sum, p) => sum + (p.width_cm * p.height_cm || 0), 0)
  const coats = 2 // default
  const coverageFactor = 0.008 // g/cm²

  metrics.expected_ink_g = totalArea * coats * coverageFactor
  metrics.total_print_area_cm2 = totalArea

  // Check stroke width (simplified)
  if (totalArea > 500) { // Large print
    issues.push({
      code: 'LARGE_PRINT_AREA',
      message: 'Large print area may require Option A route (Print → Sew)',
      placement_ref: null
    })
  }
}

async function checkSublimationRequirements(placements: any[], files: any, issues: any[], metrics: any) {
  const aopPlacements = placements.filter(p => p.area === 'all-over' || p.area === 'front' && p.width_cm > 35)

  if (aopPlacements.length > 0) {
    metrics.aop_area_cm2 = aopPlacements.reduce((sum, p) => sum + (p.width_cm * p.height_cm), 0)

    issues.push({
      code: 'AOP_DETECTED',
      message: 'All-over print requires heat press before cutting',
      placement_ref: 'all-over'
    })
  }
}

async function checkDTFRequirements(placements: any[], files: any, issues: any[], metrics: any) {
  // Check for transparent background
  if (!files.prod_url || !files.prod_url.includes('transparent')) {
    issues.push({
      code: 'NO_TRANSPARENCY',
      message: 'DTF requires transparent background in production file',
      placement_ref: null
    })
  }
}

async function checkEmbroideryRequirements(placements: any[], files: any, issues: any[], metrics: any) {
  // Estimate stitch count (very simplified)
  const totalArea = placements.reduce((sum, p) => sum + (p.width_cm * p.height_cm || 0), 0)
  const estimatedStitches = totalArea * 1000 // rough estimate

  metrics.stitch_count = estimatedStitches

  // Check stitch density
  const stitchDensity = estimatedStitches / totalArea
  if (stitchDensity > 1500) { // per cm²
    issues.push({
      code: 'HIGH_STITCH_DENSITY',
      message: 'High stitch density may cause puckering',
      placement_ref: null
    })
  }
}