// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client';
import { ConflictResolver } from '@/lib/sync/conflict-resolver';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { conflictId, resolution, manualData, reason } = await request.json();

    if (!conflictId || !resolution) {
      return NextResponse.json(
        { error: 'Conflict ID and resolution type are required' },
        { status: 400 }
      );
    }

    if (!['LOCAL', 'SERVER', 'MANUAL'].includes(resolution)) {
      return NextResponse.json(
        { error: 'Invalid resolution type' },
        { status: 400 }
      );
    }

    if (resolution === 'MANUAL' && !manualData) {
      return NextResponse.json(
        { error: 'Manual data is required for manual resolution' },
        { status: 400 }
      );
    }

    const result = await ConflictResolver.resolveConflict({
      conflictId,
      resolution,
      manualData,
      resolvedBy: session.user.id,
      reason
    }, session.user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Conflict resolved successfully'
    });

  } catch (_error) {
    console.error('Conflict resolution error:', _error);
    return NextResponse.json(
      { error: 'Failed to resolve conflict' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');
    
    const conflicts = await ConflictResolver.getConflicts(
      user_id || session.user.id
    );

    const summary = await ConflictResolver.getConflictSummary();

    return NextResponse.json({
      success: true,
      conflicts,
      summary
    });

  } catch (_error) {
    console.error('Get conflicts error:', _error);
    return NextResponse.json(
      { error: 'Failed to fetch conflicts' },
      { status: 500 }
    );
  }
}