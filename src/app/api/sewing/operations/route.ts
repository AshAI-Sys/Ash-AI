// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'

// Sewing Operations API - Mock Data for Testing
// Based on CLIENT_UPDATED_PLAN.md specifications


// Mock sewing operations data
const mockOperations = [
  {
    id: '1',
    name: 'Collar Attach',
    standard_minutes: 2.0,
    piece_rate: 5.00,
    complexity: 'MEDIUM',
    skill_level: 'INTERMEDIATE',
    description: 'Attach collar to neckline'
  },
  {
    id: '2',
    name: 'Side Seam',
    standard_minutes: 2.5,
    piece_rate: 5.00,
    complexity: 'LOW',
    skill_level: 'BEGINNER',
    description: 'Sew side seams of garment'
  },
  {
    id: '3',
    name: 'Sleeve Attach',
    standard_minutes: 3.0,
    piece_rate: 6.00,
    complexity: 'HIGH',
    skill_level: 'EXPERT',
    description: 'Attach sleeves to armholes'
  },
  {
    id: '4',
    name: 'Hemming',
    standard_minutes: 1.5,
    piece_rate: 3.50,
    complexity: 'LOW',
    skill_level: 'BEGINNER',
    description: 'Finish bottom hem'
  },
  {
    id: '5',
    name: 'Buttonhole',
    standard_minutes: 4.0,
    piece_rate: 8.00,
    complexity: 'HIGH',
    skill_level: 'EXPERT',
    description: 'Create buttonholes'
  }
]

// GET /api/sewing/operations - Get sewing operations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stats = searchParams.get('stats')

    if (stats === 'true') {
      return NextResponse.json({
        success: true,
        stats: {
          total_operations: mockOperations.length,
          avg_standard_minutes: mockOperations.reduce((sum, op) => sum + op.standard_minutes, 0) / mockOperations.length,
          avg_piece_rate: mockOperations.reduce((sum, op) => sum + op.piece_rate, 0) / mockOperations.length,
          complexity_breakdown: {
            LOW: mockOperations.filter(op => op.complexity === 'LOW').length,
            MEDIUM: mockOperations.filter(op => op.complexity === 'MEDIUM').length,
            HIGH: mockOperations.filter(op => op.complexity === 'HIGH').length
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      operations: mockOperations
    })

  } catch (_error) {
    console.error('Error fetching sewing operations:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sewing operations' },
      { status: 500 }
    )
  }
}

// POST /api/sewing/operations - Create new operation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      standard_minutes,
      piece_rate,
      complexity = 'MEDIUM',
      skill_level = 'INTERMEDIATE',
      description
    } = body

    const newOperation = {
      id: (mockOperations.length + 1).toString(),
      name,
      standard_minutes: parseFloat(standard_minutes),
      piece_rate: parseFloat(piece_rate),
      complexity,
      skill_level,
      description
    }

    mockOperations.push(newOperation)

    return NextResponse.json({
      success: true,
      message: 'Sewing operation created successfully',
      operation: newOperation
    }, { status: 201 })

  } catch (_error) {
    console.error('Error creating sewing operation:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to create sewing operation' },
      { status: 500 }
    )
  }
}