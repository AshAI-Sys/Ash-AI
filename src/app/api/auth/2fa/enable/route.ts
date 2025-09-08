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

    const isValid = await TwoFactorAuth.enableTwoFactor(session.user.id, token);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '2FA enabled successfully'
    });

  } catch (_error) {
    console.error('2FA enable error:', error);
    return NextResponse.json(
      { error: 'Failed to enable 2FA' },
      { status: 500 }
    );
  }
}