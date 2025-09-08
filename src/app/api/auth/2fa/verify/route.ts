import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { TwoFactorAuth } from '@/lib/auth/two-factor';
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

    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const verification = await TwoFactorAuth.verifyToken(session.user.id, token);

    if (!verification.isValid) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Token verified successfully',
      backupCodeUsed: verification.backupCodeUsed
    });

  } catch (_error) {
    console.error('2FA verify error:', error);
    return NextResponse.json(
      { error: 'Failed to verify token' },
      { status: 500 }
    );
  }
}