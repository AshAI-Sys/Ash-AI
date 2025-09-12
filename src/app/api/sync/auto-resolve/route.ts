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

    const result = await ConflictResolver.autoResolveConflicts(session.user.id);

    return NextResponse.json({
      success: true,
      message: `Auto-resolved ${result.resolved} conflicts`,
      resolved: result.resolved,
      remaining: result.remaining
    });

  } catch (_error) {
    console.error('Auto-resolve conflicts error:', _error);
    return NextResponse.json(
      { error: 'Failed to auto-resolve conflicts' },
      { status: 500 }
    );
  }
}