// Sewing Runs API - Mock Data for Testing
// Based on CLIENT_UPDATED_PLAN.md specifications

import { NextRequest, NextResponse } from 'next/server'

// Mock sewing runs data for testing
const mockRuns = [
  {
    id: '1',
    status: 'COMPLETED',
    operator_id: 'OP001',
    operator_name: 'Maria Santos',
    operation_name: 'Collar Attach',
    qty_good: 50,
    qty_reject: 2,
    actual_minutes: 120,
    earned_minutes: 100,
    piece_rate_earned: 250.00,
    efficiency_pct: 83.3,
    started_at: new Date().toISOString(),
    ended_at: new Date().toISOString(),
    order: {
      po_number: 'PO-2025-001',
      client: { name: 'ABC Fashion' }
    },
    sewing_operation: {
      name: 'Collar Attach',
      standard_minutes: 2.0,
      piece_rate: 5.00
    }
  },
  {
    id: '2', 
    status: 'IN_PROGRESS',
    operator_id: 'OP002',
    operator_name: 'Juan Dela Cruz',
    operation_name: 'Side Seam',
    qty_good: 30,
    qty_reject: 1,
    actual_minutes: 90,
    earned_minutes: 75,
    piece_rate_earned: 150.00,
    efficiency_pct: 83.3,
    started_at: new Date().toISOString(),
    order: {
      po_number: 'PO-2025-002',
      client: { name: 'XYZ Garments' }
    },
    sewing_operation: {
      name: 'Side Seam',
      standard_minutes: 2.5,
      piece_rate: 5.00
    }
  },
  {
    id: '3',
    status: 'CREATED',
    operator_id: 'OP003',
    operator_name: 'Rosa Garcia',
    operation_name: 'Sleeve Attach',
    qty_good: 0,
    qty_reject: 0,
    actual_minutes: 0,
    earned_minutes: 0,
    piece_rate_earned: 0,
    efficiency_pct: 0,
    started_at: new Date().toISOString(),
    order: {
      po_number: 'PO-2025-003',
      client: { name: 'Fashion Plus' }
    },
    sewing_operation: {
      name: 'Sleeve Attach',
      standard_minutes: 3.0,
      piece_rate: 6.00
    }
  }
]

// GET /api/sewing/runs - Get sewing runs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const analytics = searchParams.get('analytics')

    if (analytics === 'true') {
      return NextResponse.json({
        success: true,
        analytics: {
          total_runs: mockRuns.length,
          completed_runs: mockRuns.filter(r => r.status === 'COMPLETED').length,
          in_progress_runs: mockRuns.filter(r => r.status === 'IN_PROGRESS').length,
          pending_runs: mockRuns.filter(r => r.status === 'CREATED').length,
          average_efficiency: mockRuns.reduce((sum, r) => sum + r.efficiency_pct, 0) / mockRuns.length,
          total_pieces: mockRuns.reduce((sum, r) => sum + r.qty_good, 0),
          total_earnings: mockRuns.reduce((sum, r) => sum + r.piece_rate_earned, 0)
        }
      })
    }

    return NextResponse.json({
      success: true,
      runs: mockRuns
    })

  } catch (_error) {
    console.error('Error fetching sewing runs:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sewing runs' },
      { status: 500 }
    )
  }
}

// POST /api/sewing/runs - Create/start a new sewing run
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      operator_id,
      operation_name,
      po_number
    } = body

    const newRun = {
      id: (mockRuns.length + 1).toString(),
      status: 'CREATED',
      operator_id: operator_id || 'OP004',
      operator_name: 'New Operator',
      operation_name: operation_name || 'New Operation',
      qty_good: 0,
      qty_reject: 0,
      actual_minutes: 0,
      earned_minutes: 0,
      piece_rate_earned: 0,
      efficiency_pct: 0,
      started_at: new Date().toISOString(),
      order: {
        po_number: po_number || 'PO-2025-NEW',
        client: { name: 'New Client' }
      },
      sewing_operation: {
        name: operation_name || 'New Operation',
        standard_minutes: 2.5,
        piece_rate: 5.00
      }
    }

    mockRuns.push(newRun)

    return NextResponse.json({
      success: true,
      message: 'Sewing run created successfully',
      run: newRun
    }, { status: 201 })

  } catch (_error) {
    console.error('Error creating sewing run:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create sewing run' },
      { status: 500 }
    )
  }
}

// PUT /api/sewing/runs - Update sewing run
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      run_id,
      qty_good,
      qty_reject,
      actual_minutes,
      status = 'COMPLETED'
    } = body

    const runIndex = mockRuns.findIndex(r => r.id === run_id)
    if (runIndex === -1) {
      return NextResponse.json(
        { error: 'Sewing run not found' },
        { status: 404 }
      )
    }

    const run = mockRuns[runIndex]
    
    // Update the run
    if (qty_good !== undefined) {
      run.qty_good = qty_good
      run.qty_reject = qty_reject || 0
      run.actual_minutes = actual_minutes || 0
      
      // Calculate metrics
      const standardMinutes = run.sewing_operation.standard_minutes
      run.earned_minutes = qty_good * standardMinutes
      run.efficiency_pct = actual_minutes > 0 ? (run.earned_minutes / actual_minutes) * 100 : 0
      run.piece_rate_earned = qty_good * run.sewing_operation.piece_rate
      
      run.status = status
      run.ended_at = new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      run: run
    })

  } catch (_error) {
    console.error('Error updating sewing run:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update sewing run' },
      { status: 500 }
    )
  }
}