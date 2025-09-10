/**
 * ASH AI - Design Asset Upload API
 * Futuristic design file processing with AI-powered validation
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { validateAshleyDesignAsset } from '@/lib/ash/ashley-design-ai'
import sharp from 'sharp'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'application/pdf', 'image/tiff']

interface DesignUploadResult {
  success: boolean
  asset?: {
    id: string
    version: number
    file_name: string
    file_path: string
    thumbnail_path?: string
    ashley_analysis?: any
  }
  error?: string
  blocked_by?: string
  warnings?: string[]
}

/**
 * POST /api/designs/upload - Upload design assets with AI validation
 */
export async function POST(request: NextRequest): Promise<NextResponse<DesignUploadResult>> {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 })
    }

    // Only certain roles can upload designs
    if (![Role.ADMIN, Role.MANAGER, Role.CSR, Role.GRAPHIC_ARTIST].includes(session.user.role as Role)) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions to upload designs'
      }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const order_id = formData.get('order_id') as string
    const designType = formData.get('design_type') as string || 'MOCKUP'
    const description = formData.get('description') as string || ''
    const isReplacement = formData.get('is_replacement') === 'true'

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file provided'
      }, { status: 400 })
    }

    if (!order_id) {
      return NextResponse.json({
        success: false,
        error: 'Order ID is required'
      }, { status: 400 })
    }

    // Validate file
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        success: false,
        error: `File size too large. Maximum ${MAX_FILE_SIZE / (1024 * 1024)}MB allowed.`
      }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid file type. Allowed: PNG, JPEG, SVG, PDF, TIFF'
      }, { status: 400 })
    }

    // Verify order exists and user has access
    const order = await prisma.order.findFirst({
      where: {
        id: order_id,
        workspace_id: session.user.workspace_id
      },
      include: {
        brand: { select: { name: true, code: true } },
        client: { select: { name: true } }
      }
    })

    if (!order) {
      return NextResponse.json({
        success: false,
        error: 'Order not found or access denied'
      }, { status: 404 })
    }

    // Process file upload
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate unique file paths
    const assetId = require('nanoid').nanoid()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileExtension = file.name.split('.').pop()
    const fileName = `${order.brand.code}-${order.po_number}-${designType}-${timestamp}.${fileExtension}`
    
    // Create directory structure: designs/BRAND_CODE/YEAR/ORDER_ID/
    const brandDir = order.brand.code.toUpperCase()
    const year = new Date().getFullYear().toString()
    const uploadDir = join(process.cwd(), 'uploads', 'designs', brandDir, year, order_id)
    const filePath = join(uploadDir, fileName)
    const relativePath = join('designs', brandDir, year, order_id, fileName)

    // Ensure directory exists
    await mkdir(uploadDir, { recursive: true })

    // Save original file
    await writeFile(filePath, buffer)

    // Generate thumbnail for image files
    let thumbnailPath: string | undefined
    if (file.type.startsWith('image/') && file.type !== 'image/svg+xml') {
      try {
        const thumbnailFileName = `thumb_${fileName}`
        const thumbnailFullPath = join(uploadDir, thumbnailFileName)
        thumbnailPath = join('designs', brandDir, year, order_id, thumbnailFileName)

        await sharp(buffer)
          .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toFile(thumbnailFullPath)
      } catch (_error) {
        console.warn('Failed to generate thumbnail:', error)
      }
    }

    // Get current version number
    const existingVersions = await prisma.designAsset.count({
      where: {
        order_id: order_id,
        type: designType
      }
    })
    const newVersion = existingVersions + 1

    // Run Ashley AI design analysis
    let ashleyAnalysis
    try {
      ashleyAnalysis = await validateAshleyDesignAsset({
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        design_type: designType,
        order: order,
        buffer: buffer
      })
    } catch (_error) {
      console.warn('Ashley AI analysis failed:', error)
      ashleyAnalysis = {
        risk: 'AMBER',
        confidence: 0.3,
        issues: [{
          type: 'ANALYSIS_ERROR',
          severity: 'WARNING',
          details: 'AI analysis temporarily unavailable'
        }],
        recommendations: []
      }
    }

    // Check if Ashley blocks the upload
    const criticalIssues = ashleyAnalysis.issues?.filter(i => i.severity === 'CRITICAL') || []
    if (criticalIssues.length > 0) {
      // Delete uploaded file if blocked
      try {
        await require('fs').promises.unlink(filePath)
        if (thumbnailPath) {
          await require('fs').promises.unlink(join(uploadDir, `thumb_${fileName}`))
        }
      } catch (cleanupError) {
        console.warn('Failed to cleanup blocked file:', cleanupError)
      }

      return NextResponse.json({
        success: false,
        error: 'Ashley AI detected critical design issues',
        blocked_by: 'ASHLEY_AI_DESIGN_VALIDATION',
        warnings: criticalIssues.map(i => i.details)
      }, { status: 422 })
    }

    // Create design asset record
    const designAsset = await prisma.designAsset.create({
      data: {
        id: assetId,
        workspace_id: session.user.workspace_id,
        order_id: order_id,
        version: newVersion,
        type: designType,
        file_name: fileName,
        file_path: relativePath,
        file_size: file.size,
        file_type: file.type,
        thumbnail_path: thumbnailPath,
        description: description,
        uploaded_by_id: session.user.id,
        approval_status: 'PENDING_INTERNAL_REVIEW',
        ashley_analysis: ashleyAnalysis,
        metadata: {
          original_filename: file.name,
          upload_source: 'design_upload_api',
          ashley_version: 'v2.1.3',
          is_replacement: isReplacement
        }
      }
    })

    // Mark previous version as superseded if this is a replacement
    if (isReplacement) {
      await prisma.designAsset.updateMany({
        where: {
          order_id: order_id,
          type: designType,
          version: { lt: newVersion },
          approval_status: { not: 'SUPERSEDED' }
        },
        data: {
          approval_status: 'SUPERSEDED',
          superseded_at: new Date(),
          superseded_by_id: assetId
        }
      })
    }

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        id: require('nanoid').nanoid(),
        workspace_id: session.user.workspace_id,
        actor_id: session.user.id,
        entity_type: 'design_asset',
        entity_id: assetId,
        action: 'UPLOAD',
        after_data: {
          file_name: fileName,
          file_size: file.size,
          design_type: designType,
          version: newVersion,
          ashley_risk: ashleyAnalysis.risk
        },
        metadata: {
          source: 'design_upload_api',
          order_po: order.po_number,
          brand: order.brand.name,
          client: order.client.name,
          ashley_analysis: ashleyAnalysis,
          is_replacement: isReplacement
        }
      }
    })

    // Emit design upload event
    await emitDesignEvent('ash.design.uploaded', {
      asset_id: assetId,
      order_id: order_id,
      design_type: designType,
      version: newVersion,
      ashley_risk: ashleyAnalysis.risk,
      uploaded_by: session.user.id
    })

    return NextResponse.json({
      success: true,
      asset: {
        id: assetId,
        version: newVersion,
        file_name: fileName,
        file_path: relativePath,
        thumbnail_path: thumbnailPath,
        ashley_analysis: {
          risk: ashleyAnalysis.risk,
          confidence: ashleyAnalysis.confidence,
          issues_count: ashleyAnalysis.issues?.length || 0,
          recommendations_count: ashleyAnalysis.recommendations?.length || 0
        }
      }
    }, { status: 201 })

  } catch (_error) {
    console.error('Design upload error:', _error)
    return NextResponse.json({
      success: false,
      error: 'Failed to upload design asset'
    }, { status: 500 })
  }
}

// Helper function to emit design events
async function emitDesignEvent(eventType: string, data: any) {
  try {
    // This would integrate with your event bus system
    await prisma.systemEvent.create({
      data: {
        id: require('nanoid').nanoid(),
        event_type: eventType,
        entity_type: 'design_asset',
        entity_id: data.asset_id,
        data: data,
        status: 'OPEN',
        created_at: new Date()
      }
    })
  } catch (_error) {
    console.error('Failed to emit design event:', _error)
  }
}