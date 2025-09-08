import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { TwoFactorAuth } from '@/lib/auth/two-factor';
import { authOptions } from '@/lib/auth';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    await TwoFactorAuth.disableTwoFactor(session.user.id);

    return NextResponse.json({
      success: true,
      message: '2FA disabled successfully'
    });

  } catch (_error) {
    console.error('2FA disable error:', error);
    return NextResponse.json(
      { error: 'Failed to disable 2FA' },
      { status: 500 }
    );
  }
}