import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ConflictResolver } from '@/lib/sync/conflict-resolver';
import { authOptions } from '@/lib/auth';

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

  } catch (error) {
    console.error('Auto-resolve conflicts error:', error);
    return NextResponse.json(
      { error: 'Failed to auto-resolve conflicts' },
      { status: 500 }
    );
  }
}