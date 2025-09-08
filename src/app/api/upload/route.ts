import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// Helper function to get allowed extensions for each file type
function getAllowedExtensions(type: string): string {
  switch (type) {
    case 'mockup':
      return 'JPG, PNG, WebP, GIF'
    case 'techpack':
    case 'measurement':
      return 'JPG, PNG, PDF, DOC, DOCX'
    case 'names':
      return 'XLS, XLSX, CSV'
    case 'qc':
    default:
      return 'JPG, PNG, WebP'
  }
}

// POST /api/upload - Upload files (photos for QC evidence)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const type = formData.get('type') as string || 'qc' // qc, general, etc.

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    // Limit number of files per request to prevent DoS
    if (files.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 files allowed per request' },
        { status: 400 }
      )
    }

    // Validate file types based on upload type
    let allowedTypes: string[] = []
    
    switch (type) {
      case 'mockup':
        allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
        break
      case 'techpack':
      case 'measurement':
        allowedTypes = [
          'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]
        break
      case 'names':
        allowedTypes = [
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/csv'
        ]
        break
      case 'qc':
      default:
        allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
        break
    }
    
    const invalidFiles = files.filter(file => !allowedTypes.includes(file.type))
    
    if (invalidFiles.length > 0) {
      return NextResponse.json(
        { error: `Invalid file types. Allowed types for ${type}: ${getAllowedExtensions(type)}` },
        { status: 400 }
      )
    }

    // Validate file sizes (different limits for different types)
    const maxSize = type === 'names' ? 10 * 1024 * 1024 : // 10MB for Excel files
                   type === 'techpack' || type === 'measurement' ? 20 * 1024 * 1024 : // 20MB for docs/PDFs
                   5 * 1024 * 1024 // 5MB for images
    const oversizedFiles = files.filter(file => file.size > maxSize)
    
    if (oversizedFiles.length > 0) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      )
    }

    // Create upload directory
    const uploadDir = join(process.cwd(), 'public', 'uploads', type)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Upload files
    const uploadedFiles = []
    
    for (const file of files) {
      // Generate secure filename with validated extension
      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).substring(2)
      
      // Get file extension from MIME type instead of filename for security
      let extension = ''
      switch (file.type) {
        case 'image/jpeg':
        case 'image/jpg':
          extension = 'jpg'
          break
        case 'image/png':
          extension = 'png'
          break
        case 'image/webp':
          extension = 'webp'
          break
        case 'image/gif':
          extension = 'gif'
          break
        case 'application/pdf':
          extension = 'pdf'
          break
        case 'application/msword':
          extension = 'doc'
          break
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          extension = 'docx'
          break
        case 'application/vnd.ms-excel':
          extension = 'xls'
          break
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
          extension = 'xlsx'
          break
        case 'text/csv':
          extension = 'csv'
          break
        default:
          return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
      }
      
      // Sanitize filename - use only timestamp and random string
      const filename = `${timestamp}_${randomStr}.${extension}`
      
      // Validate file content (basic magic number check for images)
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      
      // Basic file signature validation for images
      if (file.type.startsWith('image/')) {
        const magicNumbers = buffer.subarray(0, 4)
        const isValidImage = (
          // JPEG
          (magicNumbers[0] === 0xFF && magicNumbers[1] === 0xD8) ||
          // PNG
          (magicNumbers[0] === 0x89 && magicNumbers[1] === 0x50 && magicNumbers[2] === 0x4E && magicNumbers[3] === 0x47) ||
          // GIF
          (magicNumbers[0] === 0x47 && magicNumbers[1] === 0x49 && magicNumbers[2] === 0x46) ||
          // WebP (RIFF header)
          (magicNumbers[0] === 0x52 && magicNumbers[1] === 0x49 && magicNumbers[2] === 0x46 && magicNumbers[3] === 0x46)
        )
        
        if (!isValidImage) {
          return NextResponse.json(
            { error: 'Invalid image file format' },
            { status: 400 }
          )
        }
      }
      
      const filePath = join(uploadDir, filename)
      await writeFile(filePath, buffer)
      
      // Return public URL
      const publicUrl = `/uploads/${type}/${filename}`
      
      uploadedFiles.push({
        originalName: file.name,
        filename,
        url: publicUrl,
        size: file.size,
        type: file.type
      })
    }

    return NextResponse.json({
      message: 'Files uploaded successfully',
      files: uploadedFiles
    })

  } catch (_error) {
    console.error('Error uploading files:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/upload - Get uploaded files (for listing)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'qc'

    // This would typically list files from a database or storage service
    // For now, return empty array as we're just handling uploads
    
    return NextResponse.json({
      files: []
    })

  } catch (_error) {
    console.error('Error fetching uploaded files:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}